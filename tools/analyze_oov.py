#!/usr/bin/env python3
"""Compare scorer-effective OOV with upstream wordfreq and apostrophe normalization."""
import json
import importlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
try:
    zipf_frequency = importlib.import_module('wordfreq').zipf_frequency
except ImportError as error:
    raise SystemExit('Install optional wordfreq with: uv run --no-project --with wordfreq==3.1.1 python tools/analyze_oov.py') from error
results = json.loads(subprocess.check_output(['node', str(ROOT / 'tools/analyze_corpus.js'), '--json'], cwd=ROOT))
groups = {}
samples = {}
per_document = []

for item in results:
    counts = {}
    c2_oov = set(item['levels'][-1]['selectedWords']) & set(item['effectiveOovWords'])
    for word in item['effectiveOovWords']:
        zipf = zipf_frequency(word, 'en')
        normalized = word.replace('’', "'")
        normalized_zipf = zipf_frequency(normalized, 'en')
        category = ('curly-apostrophe-common' if normalized != word and normalized_zipf >= 3
                    else 'below-local-cutoff' if zipf < 3 and zipf > 0
                    else 'zero-upstream' if zipf == 0
                    else 'unexpected-at-least-cutoff')
        groups[category] = groups.get(category, 0) + 1
        counts[category] = counts.get(category, 0) + 1
        samples.setdefault(category, []).append((word, zipf, normalized_zipf, item['genre']))
    per_document.append((item['id'], len(item['effectiveOovWords']), len(c2_oov), counts))

print('Effective OOV across documents (counts are document-word pairs, not globally deduplicated):')
for line in per_document:
    print('document', *line)
for category in sorted(groups):
    print(category, groups[category], 'examples:', samples[category][:25])
print('Heuristic comparison only: upstream rates may differ for compounds or spelling variants.')
