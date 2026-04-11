#!/usr/bin/env python3
import re, sys, os

replacements = [
    ('text-white', 'text-slate-900'),
    ('text-dark-200', 'text-slate-700'),
    ('text-dark-300', 'text-slate-500'),
    ('text-dark-400', 'text-slate-500'),
    ('text-dark-500', 'text-slate-400'),
    ('text-dark-600', 'text-slate-300'),
    ('text-dark-800', 'text-slate-200'),
    ('bg-white/5', 'bg-slate-50'),
    ('bg-white/10', 'bg-slate-100'),
    ('border-white/5', 'border-slate-200'),
    ('border-white/10', 'border-slate-200'),
    ('border-white/20', 'border-slate-200'),
    ('hover:bg-white/5', 'hover:bg-slate-50'),
    ('hover:bg-white/10', 'hover:bg-slate-100'),
    ('hover:text-white', 'hover:text-slate-900'),
    ('hover:text-dark-200', 'hover:text-slate-700'),
    ('bg-dark-800', 'bg-slate-100'),
    ('bg-dark-900/50', 'bg-slate-50'),
    ('bg-dark-900', 'bg-slate-50'),
    ('text-accent-400', 'text-indigo-600'),
    ('text-accent-300', 'text-indigo-500'),
    ('text-accent-100', 'text-indigo-700'),
    ('bg-accent-500/15', 'bg-indigo-100'),
    ('bg-accent-500/10', 'bg-indigo-50'),
    ('bg-accent-500/5', 'bg-indigo-50'),
    ('border-accent-500/10', 'border-indigo-200'),
    ('border-accent-500/30', 'border-indigo-200'),
    ('bg-accent-500', 'bg-indigo-600'),
    ('text-primary-400', 'text-blue-600'),
    ('text-primary-300', 'text-blue-500'),
    ('bg-primary-500/10', 'bg-blue-50'),
    ('bg-primary-500/5', 'bg-blue-50'),
    ('from-accent-500', 'from-indigo-600'),
    ('to-accent-400', 'to-indigo-500'),
    ('from-primary-500', 'from-blue-600'),
    ('to-primary-400', 'to-blue-500'),
    ('ring-accent-500/40', 'ring-indigo-300'),
    ('ring-primary-500/40', 'ring-indigo-300'),
    ('hover:bg-accent-500/10', 'hover:bg-indigo-50'),
    ('bg-black/60', 'bg-black/40'),
    ('accent-primary-500', 'accent-indigo-600'),
    ('accent-accent-500', 'accent-indigo-600'),
    ('bg-primary-500/50', 'bg-indigo-100'),
    ('bg-primary-500/60', 'bg-indigo-200'),
    ('bg-primary-500', 'bg-indigo-600'),
]

files = sys.argv[1:]
for fpath in files:
    with open(fpath, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(fpath, 'w') as f:
        f.write(content)
    print(f'Done: {os.path.basename(fpath)}')
