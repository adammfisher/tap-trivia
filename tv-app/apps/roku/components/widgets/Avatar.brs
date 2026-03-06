' Avatar — Player avatar circle with initial letter, optional medal & gold ring
' Color derived from name hash (matches web app nameHue function)

sub init()
  m.circleBg = m.top.findNode("circleBg")
  m.ringOverlay = m.top.findNode("ringOverlay")
  m.initialLabel = m.top.findNode("initialLabel")
  m.medalPoster = m.top.findNode("medalPoster")

  ' Medal URIs
  m.medalUris = {
    "1": "pkg:/images/medal-gold.png",
    "2": "pkg:/images/medal-silver.png",
    "3": "pkg:/images/medal-bronze.png"
  }

  ' Size presets: xs=32, sm=40, md=56, lg=72, xl=96, 2xl=128
  m.sizes = {
    xs: { w: 32, font: 16, medalSize: 20, medalPos: [20, -6] },
    sm: { w: 40, font: 20, medalSize: 24, medalPos: [26, -6] },
    md: { w: 56, font: 28, medalSize: 28, medalPos: [36, -8] },
    lg: { w: 72, font: 36, medalSize: 28, medalPos: [48, -10] },
    xl: { w: 96, font: 48, medalSize: 28, medalPos: [64, -12] },
    "2xl": { w: 128, font: 64, medalSize: 28, medalPos: [88, -14] }
  }
end sub

sub onNameChanged(event as Object)
  name = event.getData()
  if name = "" then return

  ' Set initial
  initial = UCase(Left(name, 1))
  m.initialLabel.text = initial

  ' Calculate color from name hash
  h = nameHue(name)
  color = hslToHex(h, 65, 52)
  m.circleBg.blendColor = color
end sub

sub onRankChanged(event as Object)
  rank = event.getData()
  rankStr = Str(rank).trim()
  if rank >= 1 and rank <= 3
    m.medalPoster.visible = true
    m.medalPoster.uri = m.medalUris[rankStr]
  else
    m.medalPoster.visible = false
  end if
end sub

sub onRingChanged(event as Object)
  m.ringOverlay.visible = event.getData()
end sub

sub onSizeChanged(event as Object)
  size = event.getData()
  preset = m.sizes[size]
  if preset = invalid then preset = m.sizes.md

  w = preset.w
  m.circleBg.width = w
  m.circleBg.height = w
  m.ringOverlay.width = w
  m.ringOverlay.height = w
  newFont = CreateObject("roSGNode", "Font")
  newFont.uri = "pkg:/fonts/Fredoka-Bold.ttf"
  newFont.size = preset.font
  m.initialLabel.font = newFont
  m.initialLabel.width = w
  m.initialLabel.translation = [0, Int((w - preset.font) / 2) - 2]
  m.medalPoster.translation = preset.medalPos
  m.medalPoster.width = preset.medalSize
  m.medalPoster.height = preset.medalSize
end sub

function nameHue(name as String) as Integer
  h = 0
  for i = 0 to Len(name) - 1
    h = h + Asc(Mid(name, i + 1, 1))
  end for
  return h mod 360
end function

' Convert HSL to hex color string (full mathematical conversion)
' Matches the web app's hsl() function exactly
function hslToHex(h as Integer, s as Integer, l as Integer) as String
  hf = h / 360.0
  sf = s / 100.0
  lf = l / 100.0

  if sf = 0
    v = Int(lf * 255)
    return "#" + decToHex(v) + decToHex(v) + decToHex(v)
  end if

  if lf < 0.5
    q = lf * (1 + sf)
  else
    q = lf + sf - lf * sf
  end if
  p = 2 * lf - q

  r = hueToRgb(p, q, hf + 1.0/3.0)
  g = hueToRgb(p, q, hf)
  b = hueToRgb(p, q, hf - 1.0/3.0)

  return "#" + decToHex(Int(r * 255)) + decToHex(Int(g * 255)) + decToHex(Int(b * 255))
end function

function hueToRgb(p as Float, q as Float, t as Float) as Float
  if t < 0 then t = t + 1.0
  if t > 1 then t = t - 1.0
  if t < 1.0/6.0 then return p + (q - p) * 6.0 * t
  if t < 1.0/2.0 then return q
  if t < 2.0/3.0 then return p + (q - p) * (2.0/3.0 - t) * 6.0
  return p
end function

function decToHex(val as Integer) as String
  if val < 0 then val = 0
  if val > 255 then val = 255
  hex = "0123456789abcdef"
  h1 = Mid(hex, Int(val / 16) + 1, 1)
  h2 = Mid(hex, (val mod 16) + 1, 1)
  return h1 + h2
end function
