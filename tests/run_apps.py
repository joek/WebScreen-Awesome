#!/usr/bin/env python3
"""Run every app in real Elk with deterministic WebScreen hardware/network doubles.

Requires Python 3, a C compiler, and sibling WebScreen-Software and elk checkouts.
This checks script execution/API contracts, not LVGL rendering or physical networking.
"""
import argparse
import ctypes as C
import datetime as dt
import json
import math
import os
from pathlib import Path
import random
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
V, P, Z = C.c_uint64, C.c_void_p, C.c_size_t
CALL = C.CFUNCTYPE(V, P, C.POINTER(V), C.c_int)


class Device:
    def __init__(self, library, api, scenario, app):
        self.lib = C.CDLL(str(library))
        signatures = {
            'js_create': (P, [P, Z]), 'js_eval': (V, [P, C.c_char_p, Z]),
            'js_glob': (V, [P]), 'js_set': (None, [P, V, C.c_char_p, V]),
            'js_mkfun': (V, [CALL]), 'js_type': (C.c_int, [V]),
            'js_getnum': (C.c_double, [V]), 'js_getstr': (P, [P, V, C.POINTER(Z)]),
            'js_str': (C.c_char_p, [P, V]), 'js_mkstr': (V, [P, C.c_char_p, Z]),
            'js_mknum': (V, [C.c_double]), 'js_mknull': (V, []),
            'js_mktrue': (V, []), 'js_mkfalse': (V, []), 'js_gc': (None, [P]),
        }
        for name, (result, args) in signatures.items():
            getattr(self.lib, name).restype = result
            getattr(self.lib, name).argtypes = args
        self.arena = C.create_string_buffer(256 * 1024)
        self.js = self.lib.js_create(self.arena, len(self.arena))
        if hasattr(self.lib, 'js_setmaxsteps'):
            self.lib.js_setmaxsteps.argtypes = [P, Z]
            self.lib.js_setmaxsteps(self.js, 200000)
        self.scenario, self.app = scenario, app
        self.now = 0
        self.online = scenario != 'offline'
        self.synced = self.online
        self.styles, self.objects, self.timers = {}, {}, {}
        self.button, self.errors, self.callbacks = '', [], []
        self.messages, self.subscribed = [], False
        self.mqtt_attempts = 0
        self.requests = []
        self.rng = random.Random(42)
        self.config = json.loads((app.parent / 'app.json').read_text())
        self.config['settings']['wifi'] = {'ssid': '', 'pass': ''}
        if scenario == 'missing':
            self.config = None
        self.files = {'/speech.txt': 'First line, with punctuation.\n' * 100,
                      '/': 'FILE: script.js\nDIR: photos\nFILE: speech.txt\nFILE: blink.gif\nFILE: cat.gif\n'}
        for name in api:
            def native(js, args, count, name=name):
                try:
                    return self.encode(self.call(name, [self.decode(args[i]) for i in range(count)]))
                except Exception as error:
                    self.errors.append(f'{name}: {error}')
                    return self.lib.js_mknull()
            callback = CALL(native)
            self.callbacks.append(callback)
            self.lib.js_set(self.js, self.lib.js_glob(self.js), name.encode(), self.lib.js_mkfun(callback))

    def decode(self, value):
        kind = self.lib.js_type(value)
        if kind == 4:
            size = Z()
            address = self.lib.js_getstr(self.js, value, C.byref(size))
            return C.string_at(address, size.value).decode('utf-8', errors='replace')
        if kind == 5:
            return self.lib.js_getnum(value)
        if kind in (2, 3):
            return kind == 2
        return None

    def encode(self, value):
        if value is None:
            return self.lib.js_mknull()
        if isinstance(value, bool):
            return self.lib.js_mktrue() if value else self.lib.js_mkfalse()
        if isinstance(value, (float, int)):
            return self.lib.js_mknum(value)
        data = value.encode()
        return self.lib.js_mkstr(self.js, data, len(data))

    def evaluate(self, source):
        data = source.encode()
        value = self.lib.js_eval(self.js, data, len(data))
        assert self.lib.js_type(value) != 6, source[:60] + ': ' + self.lib.js_str(self.js, value).decode()
        assert not self.errors, '; '.join(self.errors[:5])
        return self.decode(value)

    def call(self, name, a):
        if name == 'print':
            return None
        if name == 'delay':
            raise AssertionError('apps must return promptly; use a timer')
        if name == 'create_style':
            h = len(self.styles)
            assert h < 32, '32-style registry exhausted'
            self.styles[h] = {}
            return h
        if name == 'show_gif_from_sd':
            return None  # Firmware returns null on success AND failure.
        if name in ('create_label', 'create_image', 'draw_rect'):
            h = len(self.objects) + 256
            assert len(self.objects) < 256, 'object registry exhausted'
            self.objects[h] = {'kind': name, 'text': '', 'styles': [], 'args': a}
            return h
        if name.startswith('style_set_'):
            assert len(a) == 2 and a[0] in self.styles, 'invalid style handle/arguments'
            assert isinstance(a[1], (int, float)) and math.isfinite(a[1]), 'invalid numeric value'
            if name == 'style_set_text_font':
                assert a[1] in (14, 20, 28, 34, 40, 44, 48), f'unavailable font {a[1]}'
            self.styles[a[0]][name[10:]] = a[1]
            return None
        if name in ('obj_add_style', 'label_set_text', 'obj_set_size', 'move_obj', 'obj_add_flag', 'obj_clear_flag'):
            assert a[0] in self.objects, 'invalid object handle'
            obj = self.objects[a[0]]
            if name == 'obj_add_style':
                assert a[1] in self.styles, 'invalid style handle'
                if a[1] in obj['styles']:
                    obj['styles'].remove(a[1])
                obj['styles'].append(a[1])
            elif name == 'label_set_text':
                assert isinstance(a[1], str), f'label text is {a[1]!r}'
                assert len(a[1].encode()) <= 255, 'label text exceeds firmware 255-byte limit'
                obj['text'] = a[1]
            else:
                obj[name] = a[1:]
            return None
        if name == 'create_timer':
            assert re.fullmatch(r'[A-Za-z_$][\w$]{0,54}', a[0]), 'invalid callback name'
            assert 1 <= a[1] <= 2147483647, 'invalid period'
            self.timers[a[0]] = [a[1], self.now + a[1]]
            assert len(self.timers) <= 32
            return None
        if name == 'timer_delete':
            self.timers.pop(a[0], None)
            return True
        if name == 'on_button':
            self.button = a[0]
            return True
        if name == 'wifi_status':
            return self.online
        if name == 'wifi_get_ip':
            return '192.0.2.10' if self.online else ''
        if name == 'ntp_synced':
            return self.synced
        if name == 'get_millis':
            return self.now % 4294967296
        epoch = 1767225600 + int(self.now / 1000)
        date = dt.datetime.fromtimestamp(epoch, dt.timezone.utc)
        if name == 'get_epoch':
            return epoch if self.synced else 0
        parts = {'get_hours': date.hour, 'get_minutes': date.minute, 'get_seconds': date.second,
                 'get_year': date.year, 'get_month': date.month, 'get_day': date.day,
                 'get_weekday': (date.weekday() + 1) % 7}
        if name in parts:
            return parts[name] if self.synced else -1
        if name == 'format_time':
            return date.strftime(a[0]) if self.synced else ''
        if name == 'str_length':
            assert isinstance(a[0], str)
            return len(a[0].encode())
        if name == 'str_index_of':
            return a[0].encode().find(a[1].encode())
        if name == 'str_substring':
            data = a[0].encode()
            start = max(0, min(len(data), int(a[1])))
            end = len(data) if a[2] < 0 else start + int(a[2])
            return data[start:end].decode(errors='replace')
        if name == 'str_split':
            fields = a[0].split(a[1])
            return fields[int(a[2])] if 0 <= a[2] < len(fields) else None
        if name == 'str_split_count':
            return len(a[0].split(a[1])) if a[0] and a[1] else 0
        if name == 'toNumber':
            try:
                match = re.match(r'^[ \t]*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)', a[0])
                return float(match[1]) if match else 0
            except (ValueError, TypeError):
                return 0
        if name == 'numberToString':
            assert isinstance(a[0], (float, int)) and math.isfinite(a[0])
            return str(int(a[0])) if a[0] == int(a[0]) else f'{a[0]:.6g}'
        if name == 'format_number':
            return f'{a[0]:.{int(a[1]) if len(a)>1 else 0}f}'
        if name == 'pad_number':
            return str(int(a[0])).zfill(int(a[1]))
        if name == 'random':
            if not a:
                return self.rng.random()
            return self.rng.randrange(int(a[0])) if len(a) == 1 else self.rng.randrange(int(a[0]), int(a[1]))
        if name == 'sd_read_file':
            if a[0] == '/webscreen.json':
                return json.dumps(self.config) if self.config is not None else None
            return None if self.scenario == 'missing' else self.files.get(a[0])
        if name == 'sd_list_dir':
            return '' if self.scenario == 'missing' else self.files['/']
        if name == 'parse_json_value':
            try:
                data = json.loads(a[0])
                value = data.get(a[1]) if isinstance(data, dict) else None
                if value is None:
                    return ''
                if isinstance(value, str):
                    return value
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    return f'{value:.2f}'  # Arduino String(double) default precision.
                return json.dumps(value, separators=(',', ':'))
            except (ValueError, TypeError):
                return ''
        if name == 'mem_info':
            return json.dumps({'heap_free': 90000, 'heap_min': 80000, 'heap_largest': 70000,
                              'psram_free': 6000000, 'js_used': 30000, 'js_total': 262144})
        if name == 'http_get':
            assert self.online, 'HTTP request while offline'
            self.requests.append(a[0])
            self.now += 125
            if self.scenario == 'missing':
                return ''
            if self.scenario == 'bad_data':
                return 'ERROR: low memory'
            return '+21°C|Partly cloudy|60%|NE12km/h' if 'wttr.in' in a[0] else 'Microsoft Connect Test'
        if name == 'mqtt_init':
            assert isinstance(a[0], str) and 0 < len(a[0]) < 128
            assert 1 <= a[1] <= 65535
            return True
        if name == 'mqtt_connect':
            assert self.online
            self.mqtt_attempts += 1
            return self.scenario != 'missing' or self.mqtt_attempts > 1
        if name == 'mqtt_subscribe':
            assert isinstance(a[0], str) and 0 < len(a[0]) < 128
            self.subscribed = True
            return True
        if name == 'mqtt_has_message':
            return bool(self.messages)
        if name == 'mqtt_get_payload':
            return self.messages[0] if self.messages else ''
        if name == 'mqtt_get_topic':
            return 'webscreen/notifications'
        if name == 'mqtt_msg_clear':
            if self.messages:
                self.messages.pop(0)
            return None
        if name in ('mqtt_loop', 'mqtt_on_message', 'button_set_toggle', 'gc'):
            return None
        raise AssertionError(f'unmodelled API {name}')

    def run(self, steps):
        self.evaluate(self.app.read_text())
        initial_styles, initial_objects = len(self.styles), len(self.objects)
        for i in range(steps):
            if not self.timers:
                break
            self.now = max(self.now, min(t[1] for t in self.timers.values()))
            for name in list(self.timers):
                if name in self.timers and self.timers[name][1] <= self.now:
                    self.timers[name][1] = self.now + self.timers[name][0]
                    self.evaluate(name + '();')
            if i % 25 == 0:
                self.lib.js_gc(self.js)
            if i in (10, 30, 60) and self.button:
                self.evaluate(self.button + '(1);')
            if self.app.parent.name == 'mqtt_notifications' and i % 20 == 5 and self.subscribed:
                self.messages = ['hello, from MQTT', '{bad json',
                                 json.dumps({'title':'A, B', 'message':'A long message. ' * 50, 'source':'Test'})]
        assert len(self.styles) == initial_styles, 'styles allocated after startup'
        assert len(self.objects) == initial_objects, 'objects allocated after startup'
        self.check_behavior()
        return initial_styles, initial_objects


    def text(self, variable):
        return self.objects[self.evaluate(variable + ';')]['text']

    def check_behavior(self):
        name = self.app.parent.name
        if name == 'ping':
            assert self.evaluate('pingCount;') == len(self.requests)
            if self.scenario in ('missing', 'bad_data'):
                assert self.evaluate('successCount;') == 0, 'HTTP failure counted as success'
            if self.scenario == 'offline':
                assert not self.requests
                self.online = True
                self.evaluate('main_loop();')
                assert len(self.requests) == 1, 'did not recover after WiFi returned'
        if name == 'mqtt_notifications':
            if self.scenario == 'offline':
                assert self.mqtt_attempts == 0
                self.online = True
                self.evaluate('main_loop();')
                assert self.subscribed, 'did not connect after WiFi returned'
            elif self.scenario == 'missing':
                assert self.mqtt_attempts >= 2 and self.subscribed, 'initial broker failure was never retried'
            self.messages = ['plain, with commas', json.dumps({'title': 'A, B', 'message': 'M, N'})]
            self.evaluate('main_loop();')
            assert not self.messages, 'did not drain the message queue'
            assert self.evaluate('getTitle(0);') == 'A, B'
            assert self.evaluate('getMsg(0);') == 'M, N'
            assert self.evaluate('getMsg(1);') == 'plain, with commas'
        if name == 'weather':
            if self.scenario == 'online':
                assert self.text('tempLabel') == '21 C'
                assert self.text('descLabel') == 'Partly cloudy'
                assert '60%' in self.text('detailsLabel')
            elif self.scenario == 'offline':
                assert not self.requests
                self.online = True
                self.evaluate('fetch_weather();')
                assert self.text('tempLabel') == '21 C'
            else:
                assert self.text('tempLabel') == '-- C', 'bad response replaced valid readings'
                assert 'retry' in self.text('statusLabel')
        if name in ('clock', 'timeapi') and self.app.name != 'script_test.js':
            if self.scenario == 'offline':
                assert self.text('timeLabel') == '--:--:--'
                self.synced = self.online = True
                self.evaluate('update_clock();')
                assert '--' not in self.text('timeLabel')
        if name == 'dual_clock':
            self.synced = True
            self.evaluate('offsetDiff = 5.5; update_clock();')
            first, second = self.text('time1'), self.text('time2')
            a = int(first[:2]) * 60 + int(first[3:5])
            b = int(second[:2]) * 60 + int(second[3:5])
            assert (b - a) % 1440 == 330, 'fractional-hour timezone lost minutes'
        if name == 'calculator':
            for keys, expected in [(('C','1','2','+','5','='), '17'),
                                   (('C','8','/','0','='), 'Error'),
                                   (('C','8','/','0','.','5','='), '16'),
                                   (('C','1','.','5','x','2','='), '3'),
                                   (('C','9','+/-','%'), '-0.09')]:
                for key in keys:
                    self.evaluate('key(' + json.dumps(key) + ');')
                assert self.text('mainDisplay') == expected, (keys, self.text('mainDisplay'))
        if name == 'timer':
            self.evaluate('remaining = 300; running = 1; remainderMs = 0; previousMs = get_millis(); render_timer();')
            assert self.text('timerLabel') == '05:00'
            self.now += 10400
            self.evaluate('timer_tick();')
            assert self.evaluate('remaining;') == 290, 'timer drifts when callbacks are delayed'
            self.evaluate('timer_button(1);')
            self.now += 20000
            self.evaluate('timer_tick();')
            assert self.evaluate('remaining;') == 290, 'pause counted elapsed time'
            self.evaluate('timer_button(1);')
            self.now += 600
            self.evaluate('timer_tick();')
            assert self.evaluate('remaining;') == 289, 'fractional second lost across pause'
            self.now += 300000
            self.evaluate('timer_tick();')
            assert self.evaluate('remaining;') == 0
            self.evaluate('timer_button(1);')
            assert self.evaluate('remaining;') == self.evaluate('duration;')
            self.now = 4294967000
            self.evaluate('previousMs = get_millis(); remainderMs = 0;')
            self.now += 1500
            self.evaluate('timer_tick();')
            assert self.evaluate('remaining;') == self.evaluate('duration;') - 1, 'millis wrap lost time'
        if name == 'pomodoro':
            self.evaluate('running = 1; isWork = 1; sessions = 0; phaseMs = WORK_TIME * 1000; previousMs = get_millis();')
            self.now += 1500000
            self.evaluate('timer_tick();')
            assert self.evaluate('isWork;') == 0 and self.evaluate('sessions;') == 1
            assert self.text('timerLabel') == '05:00'
            self.now += 300000
            self.evaluate('timer_tick();')
            assert self.evaluate('isWork;') == 1
        if name == 'notifications':
            self.evaluate('addNotification("Comma, title", "A, B", "Source");')
            assert self.text('messageLabel') == 'A, B'
            assert self.evaluate('n0.title;') == 'Comma, title'
            assert self.evaluate('notifCount;') <= 5
        if name == 'teleprompter':
            if self.scenario != 'missing':
                assert 'First line' in self.evaluate('speech;'), 'SD speech was not loaded'
            self.evaluate('paused = 1;')
            y = self.evaluate('currentY;')
            self.now += 10000
            self.evaluate('scroll_tick();')
            assert self.evaluate('currentY;') == y
            self.evaluate('pause_speech(1);')
            self.now += 100
            self.evaluate('scroll_tick();')
            assert self.evaluate('currentY;') != y
        if name == 'snake':
            assert self.evaluate('snakeLength;') <= 11
            self.evaluate('restart(1);')
            assert self.evaluate('gameOver;') == 0 and self.evaluate('score;') == 0
            assert self.evaluate('occupied(body.x, body.y);') == 1, 'loop return lost collision result'
            self.evaluate('let collisions = 0; let index = 0;')
            for _ in range(100):
                self.evaluate('game_update();')
                assert self.evaluate('snakeX;') in range(30)
                assert self.evaluate('snakeY;') in range(12)
                self.evaluate('collisions = 0; index = 0; '
                              'for (let node = body; node; node = node.next) { '
                              'if (index < snakeLength - 1 && node.x === snakeX && node.y === snakeY) collisions++; '
                              'index++; }')
                assert self.evaluate('collisions;') == 0, 'head overlaps body'
        if name == 'sd_reader':
            if self.scenario == 'missing':
                assert 'unavailable' in self.text('row0')
            else:
                assert self.evaluate('count;') == 5
                self.evaluate('page = 0; next_page(1);')
                assert self.text('row0') == 'FILE: cat.gif'
        if name == 'stocks':
            for i in range(1, 5):
                assert self.evaluate(f'price{i};') > 0
        if name == 'music':
            self.evaluate('isPlaying = 1; progress = 0; remainderMs = 0; previousMs = get_millis();')
            self.now += 15000
            self.evaluate('updatePlayback();')
            assert self.evaluate('progress;') == 15
            self.evaluate('toggle_playback(1);')
            self.now += 10000
            self.evaluate('updatePlayback();')
            assert self.evaluate('progress;') == 15
        if name == 'reminders':
            self.synced = True
            self.now = 9 * 3600000
            self.evaluate('update_tick();')
            assert self.text('line1').startswith('[!]'), 'due item was marked completed automatically'
            self.evaluate('acknowledge(1);')
            assert self.text('line1').startswith('[X]')
            self.now += 24 * 3600000
            self.evaluate('update_tick();')
            assert self.text('line1').startswith('[!]'), 'daily reminders were not reset'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--firmware', type=Path, default=ROOT.parent / 'WebScreen-Software')
    parser.add_argument('--elk', type=Path, help='Engine directory; defaults to firmware/webscreen')
    parser.add_argument('--app', default='*')
    parser.add_argument('--steps', type=int, default=250)
    parser.add_argument('--scenario', choices=['online','offline','missing','bad_data'])
    args = parser.parse_args()
    firmware = args.firmware.resolve()
    engine = (args.elk or firmware / 'webscreen').resolve()
    api = re.findall(r'js_set\(js, global, "([^"]+)"', (firmware/'webscreen/ws_elk_runtime.h').read_text())
    failures = []
    count = 0
    with tempfile.TemporaryDirectory(prefix='webscreen-app-tests-') as tmp:
        library = Path(tmp) / 'elk.so'
        subprocess.run([os.environ.get('CC','cc'), '-shared', '-fPIC', '-O1', '-g',
                        str(engine/'elk.c'), '-lm', '-o', str(library)], check=True)
        for app in sorted((ROOT/'examples').glob(args.app+'/*.js')):
            for scenario in ([args.scenario] if args.scenario else ['online','offline','missing','bad_data']):
                try:
                    device = Device(library, api, scenario, app)
                    styles, objects = device.run(args.steps)
                    print(f'PASS {app.parent.name}/{app.name} {scenario}: {styles} styles, {objects} objects', flush=True)
                except Exception as error:
                    failures.append(f'{app.parent.name}/{app.name} {scenario}: {error}')
                    print('FAIL ' + failures[-1], flush=True)
                count += 1
    print(f'{count-len(failures)}/{count} app scenarios passed ({engine})')
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
