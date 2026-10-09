#!/usr/bin/env python3
"""离线生成精简英文 Zipf 词表,供智译插件本地判定疑难词使用。

用法:
    python -m venv /tmp/wf-venv && /tmp/wf-venv/bin/pip install wordfreq
    /tmp/wf-venv/bin/python tools/build_zipf_table.py

产物:
    lib/en-zipf.js   形如 window.__EN_ZIPF={"the":7.73,...};

设计:
    - 判定规则为 `zipf(word) < 阈值 T` → 疑难词(越罕见越可能被翻译)。
    - 未登录词(OOV)视为 Zipf=0 → 必然 < T → 判为最难(安全方向,修掉漏译)。
    - 因此词表只需收录 Zipf >= CUTOFF 的“偏常见”词;低于 CUTOFF 的词一律默认难,
      无需入表。CUTOFF 应 <= 最低阈值,保证任何档位下判定都正确。
"""
from wordfreq import top_n_list, zipf_frequency
import json
import os

LANG = "en"
N = 200_000      # 从最高频词向下枚举的上限
CUTOFF = 3.0     # Zipf < CUTOFF 的词默认判为“难”,不入表(应 <= 最低阈值)
OUT = os.path.join(os.path.dirname(__file__), "..", "lib", "en-zipf.js")


def main() -> None:
    table = {}
    for w in top_n_list(LANG, N):
        z = round(zipf_frequency(w, LANG), 2)
        if z >= CUTOFF:
            table[w] = z

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.__EN_ZIPF=")
        json.dump(table, f, separators=(",", ":"))
        f.write(";")

    size_kb = os.path.getsize(OUT) / 1024
    print(f"entries={len(table)} cutoff={CUTOFF} size={size_kb:.0f}KB -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
