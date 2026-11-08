"""Presentation-only palette pass. Does not change source templates or analysis logic."""
import re
PALETTE={'canvas':'#e4e4e2','paper':'#faf9f6','ink':'#171717','muted':'#74736f','line':'#d5d5d1','dev':'#f4f00d'}
def apply_theme(source):
 def replace(m):
  raw=m.group()[1:].lower()
  if len(raw)==3:raw=''.join(c*2 for c in raw)
  rgb=raw[:6];alpha=raw[6:]
  if rgb=='f4f00d':return '#'+raw
  r,g,b=(int(rgb[i:i+2],16) for i in (0,2,4))
  if max(r,g,b)-min(r,g,b)<=8:return '#'+raw
  l=.2126*r+.7152*g+.0722*b
  color='#ffffff' if l>246 else '#faf9f6' if l>235 else '#e4e4e2' if l>216 else '#d5d5d1' if l>183 else '#a6a6a0' if l>145 else '#74736f' if l>105 else '#4e4e4b' if l>72 else '#171717'
  return color+alpha
 return re.sub(r'#[0-9a-fA-F]{8}(?![\w-])|#[0-9a-fA-F]{6}(?![\w-])|#[0-9a-fA-F]{3}(?![\w-])',replace,source)
