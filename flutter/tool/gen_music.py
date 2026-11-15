"""Regenerate the Flutter score from the web music.js (standard Python only)."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = (root / 'music.js').read_text()
songs = []


def bars(text):
    return [[None if n == '-' else int(n) for n in bar.split()]
            for bar in text.split('|')]


pattern = r"song\('([^']+)', (\d+), '([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
for match in re.finditer(pattern, source):
    title, bpm, voice, chords, verse, bridge, beat = match.groups()
    songs.append(dict(title=title, bpm=int(bpm), voice=voice,
                      chords=bars(chords), bars=bars(verse) * 2 + bars(bridge) + bars(beat)))

grooves = re.findall(r"\['([\d\s-]+)', '([\d\s-]+)', '([\d\s-]+)', '([\d\s-]+)', '([\d\s-]+)', ([.\d]+), (-?\d+)\]", source)
assert len(songs) == len(grooves) == 6
for song, groove in zip(songs, grooves):
    song['groove'] = {key: [None if c == '-' else int(c)
                           for c in re.sub(r'\s', '', value)]
                      for key, value in zip(['low', 'hand', 'wood', 'shaker', 'bass'], groove[:5])}
    song['swing'] = float(groove[5])
    song['register'] = int(groove[6]) - 12

target = root / 'flutter/lib/game/music_data.dart'
target.write_text('// Generated from music.js by tool/gen_music.py. Do not edit by hand.\n'
                  + "const musicData = r'''\n"
                  + json.dumps(songs, separators=(',', ':')) + "\n''';\n")
print(f'Wrote {len(songs)} songs to {target}')
