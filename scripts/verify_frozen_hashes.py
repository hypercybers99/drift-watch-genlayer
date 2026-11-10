import sys
import os
import inspect
import hashlib
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../tests'))
from contracts import DriftWatch

fns = [
    'page_text',
    'normalize_clause',
    'split_clauses',
    'norm_hash',
    'clause_diff',
    'parse_labels',
    'decide',
    'injection_tripwire'
]

print("=== FROZEN FUNCTION SHA-256 ===")
for name in fns:
    fn = getattr(DriftWatch, name)
    src = inspect.getsource(fn)
    h = hashlib.sha256(src.encode('utf-8')).hexdigest()
    print(f"{name}: {h}")

with open(os.path.join(os.path.dirname(__file__), '../contracts/DriftWatch.py'), 'r', encoding='utf-8') as f:
    code = f.read()

m = re.search(r'\"instructions\": \((.*?)\),\n\s*\"redlines\":', code, re.DOTALL)
if m:
    instr = eval('(' + m.group(1).strip() + ')')
    h = hashlib.sha256(instr.encode('utf-8')).hexdigest()
    print(f"prompt_instructions: {h}")
    print(f"prompt_instructions_len: {len(instr)}")
else:
    print("Could not find prompt instructions")
