import urllib.request
import urllib.parse
import http.cookiejar
import time

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_url = "http://192.168.0.11:5000/login"
login_data = urllib.parse.urlencode({"pin": "1122"}).encode("utf-8")
opener.open(urllib.request.Request(login_url, data=login_data))

cmd_url = "http://192.168.0.11:5000/send_command"
fwd = urllib.parse.urlencode({"command": 'base -c {"T":1,"L":0.4,"R":0.4}'}).encode("utf-8")
r1 = opener.open(urllib.request.Request(cmd_url, data=fwd))
print("Start command result:", r1.read().decode("utf-8"))

time.sleep(1.0)

stop = urllib.parse.urlencode({"command": 'base -c {"T":1,"L":0,"R":0}'}).encode("utf-8")
r2 = opener.open(urllib.request.Request(cmd_url, data=stop))
print("Stop command result:", r2.read().decode("utf-8"))