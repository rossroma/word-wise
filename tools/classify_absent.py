#!/usr/bin/env python3
"""Export every local-table-absent token with upstream frequency evidence.

Run: uv run --no-project --with wordfreq python tools/classify_absent.py
"""
import csv
import importlib
import json
from pathlib import Path
import subprocess
from collections import Counter, defaultdict
import re

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tests/corpus/absent-words.csv'
SUMMARY = ROOT / 'tests/corpus/absent-summary.json'
try:
    zipf_frequency = importlib.import_module('wordfreq').zipf_frequency
except ImportError as error:
    raise SystemExit('Install the optional wordfreq dependency with: uv run --no-project --with wordfreq==3.1.1 python tools/classify_absent.py') from error
results = json.loads(subprocess.check_output(['node', str(ROOT / 'tools/analyze_corpus.js'), '--json'], cwd=ROOT))
table_match = re.search(r'window\.__EN_ZIPF=(\{.*\});?', (ROOT / 'lib/en-zipf.js').read_text(encoding='utf8'))
if not table_match:
    raise ValueError('Missing local wordfreq table in lib/en-zipf.js')
table = json.loads(table_match.group(1))
historic_spellings = {'publick', 'stroling', 'catholick', 'dyet', 'houshold', 'encrease', 'encreased', 'encreaseth', 'prolifick', 'cabbin', 'barbadoes'}


def classify(record, upstream, normalized):
    word = record['word']
    surfaces = record['surfaces']
    if '’' in word or "'" in word:
        if normalized >= 3 and upstream < 3:
            return 'apostrophe-normalization'
        return 'apostrophe-or-possessive'
    if '-' in word:
        return 'compound-with-known-parts' if record['scorerZipf'] > 0 else 'compound-with-unknown-part'
    if any(s.isupper() and 2 <= len(s) <= 6 for s in surfaces) and not any(s.islower() for s in surfaces):
        return 'acronym-candidate'
    if any(s[:1].isupper() for s in surfaces):
        return 'capitalized-surface-review'
    if word in historic_spellings:
        return 'historic-spelling-candidate'
    roots = {word[:-len(suffix)] for suffix in ('s', 'es', 'ed', 'ing', 'ly') if word.endswith(suffix)}
    if word.endswith('ies'):
        roots.add(word[:-3] + 'y')
    for suffix in ('ed', 'ing'):
        if word.endswith(suffix):
            roots.add(word[:-len(suffix)] + 'e')
    if any(root != word and root in table for root in roots):
        return 'derived-form-candidate'
    if upstream == 0:
        return 'upstream-zero-review'
    if upstream < 3:
        return 'low-frequency-below-cutoff'
    return 'table-gap-review'


rows = []
counts = defaultdict(Counter)
for item in results:
    for record in item['absentRecords']:
        word = record['word']
        upstream = zipf_frequency(word, 'en')
        normalized = zipf_frequency(word.replace('’', "'"), 'en')
        category = classify(record, upstream, normalized)
        row = {
            'document': item['id'], 'genre': item['genre'], 'word': word,
            'surfaces': '|'.join(record['surfaces']), 'occurrences': record['occurrences'],
            'category': category, 'upstream_zipf': upstream,
            'normalized_zipf': normalized, 'scorer_zipf': record['scorerZipf'],
            'selected_levels': '|'.join(record['selectedLevels']),
        }
        rows.append(row)
        counts[item['id']][category] += 1
        counts['total'][category] += 1

fields = ['document', 'genre', 'word', 'surfaces', 'occurrences', 'category',
          'upstream_zipf', 'normalized_zipf', 'scorer_zipf', 'selected_levels']
with OUT.open('w', newline='', encoding='utf8') as file:
    writer = csv.DictWriter(file, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)

global_words = {}
for row in rows:
    word = row['word']
    if word not in global_words:
        global_words[word] = {
            'word': word, 'category': row['category'], 'upstream_zipf': row['upstream_zipf'],
            'scorer_zipf': row['scorer_zipf'], 'occurrences': 0, 'documents': [],
            'selected_c2_documents': 0,
        }
    entry = global_words[word]
    entry['occurrences'] += row['occurrences']
    entry['documents'].append(row['document'])
    entry['selected_c2_documents'] += int('C2' in row['selected_levels'].split('|'))

inventory = ROOT / 'tests/corpus/absent-vocabulary.csv'
with inventory.open('w', newline='', encoding='utf8') as file:
    fields = ['word', 'category', 'upstream_zipf', 'scorer_zipf', 'occurrences',
              'document_count', 'documents', 'selected_c2_documents']
    writer = csv.DictWriter(file, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    for entry in sorted(global_words.values(), key=lambda value: (value['category'], value['word'])):
        writer.writerow({**entry, 'document_count': len(entry['documents']),
                         'documents': '|'.join(entry['documents'])})

summary = {
    'unit': 'document-word pair (a word present in two documents counts twice)',
    'absent_pairs': len(rows),
    'global_unique_words': len({row['word'] for row in rows}),
    'effective_oov_pairs': sum(row['scorer_zipf'] == 0 for row in rows),
    'categories': dict(counts['total']),
    'unique_categories': dict(Counter(value['category'] for value in global_words.values())),
    'per_document': {item['id']: dict(counts[item['id']]) for item in results},
}
SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps(summary, ensure_ascii=False, indent=2))
print(f'Full list: {OUT}')
print(f'Globally deduplicated list: {inventory}')
