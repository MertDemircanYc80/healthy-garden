#!/usr/bin/env python3
"""Reproduce the 30-day PMData subset without downloading the 1.4 GB archive.
Python 3.9+, standard library only. Source: https://datasets.simula.no/pmdata/
PMData data: Thambawita et al., 2020, CC BY-NC 4.0. See datasets/README.md.
Run from any directory: python3 scripts/import-pmdata.py
"""
import collections
import datetime
import hashlib
import io
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = "https://datasets.simula.no/downloads/pmdata.zip"
NAMES = ["steps.json", "sleep.json", "sedentary_minutes.json", "moderately_active_minutes.json", "very_active_minutes.json", "lightly_active_minutes.json"]

class RemoteArchive(io.RawIOBase):
    def __init__(self):
        with urllib.request.urlopen(urllib.request.Request(URL, method="HEAD"), timeout=30) as response:
            self.size = int(response.headers["Content-Length"])
        self.pos = 0
    def seekable(self):
        return True
    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos
    def tell(self):
        return self.pos
    def read(self, n=-1):
        n = self.size-self.pos if n < 0 else min(n, self.size-self.pos)
        if not n:
            return b""
        request = urllib.request.Request(URL, headers={"Range": f"bytes={self.pos}-{self.pos+n-1}"})
        with urllib.request.urlopen(request, timeout=60) as response:
            if response.status != 206:
                raise RuntimeError("Server did not honor HTTP Range; refusing full-archive download")
            data = response.read()
        self.pos += len(data)
        return data

def main():
    archive = zipfile.ZipFile(RemoteArchive())
    raw = {name: archive.read("p01/fitbit/" + name) for name in NAMES}
    decoded = {name: json.loads(data) for name, data in raw.items()}
    steps = collections.defaultdict(int)
    for row in decoded["steps.json"]:
        steps[row["dateTime"][:10]] += int(row["value"])
    sleep = {}
    for row in decoded["sleep.json"]:
        date = row["dateOfSleep"]
        if date not in sleep or row["duration"] > sleep[date]["duration"]:
            sleep[date] = row
    maps = {name: {row["dateTime"][:10]: int(row["value"]) for row in decoded[name+".json"]} for name in ["sedentary_minutes", "moderately_active_minutes", "very_active_minutes"]}
    days = []
    for i in range(30):
        date = (datetime.date(2019, 11, 2) + datetime.timedelta(days=i)).isoformat()
        night = sleep.get(date)
        days.append({"date": date, "steps": steps.get(date), "sleep_minutes": night["minutesAsleep"] if night else None,
                     "bedtime": night["startTime"][11:16] if night else None,
                     "sedentary_minutes": maps["sedentary_minutes"].get(date),
                     "active_minutes": maps["moderately_active_minutes"].get(date, 0) + maps["very_active_minutes"].get(date, 0)})
    existing = json.loads((ROOT/"datasets/pmdata-p01-month.json").read_text())
    expected = existing["rawFileSha256"]
    actual = {name: hashlib.sha256(data).hexdigest() for name, data in raw.items()}
    if actual != expected:
        raise RuntimeError("Upstream source changed. Review the new files before replacing the fixture.")
    if days != existing["days"]:
        raise RuntimeError("Transformation differs from the committed subset. Nothing was overwritten.")
    print("Verified 30 days against the original PMData archive and all 6 source-file hashes.")

if __name__ == "__main__":
    main()
