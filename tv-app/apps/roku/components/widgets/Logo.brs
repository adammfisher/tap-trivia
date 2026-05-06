' Logo — TapTrivia logo in "Tap" (white) + "Trivia" (gold)
' Sizes: xs=20, sm=28, md=48, playing=32, getready=56, lg=64, lobby=72, xl=80, hero=96

sub init()
  m.tapLabel = m.top.findNode("tapLabel")
  m.triviaLabel = m.top.findNode("triviaLabel")

  ' Default size: md (48px)
  setLogoFontSize(48)
end sub

sub onSizeChanged(event as Object)
  size = event.getData()

  if size = "xs"
    fontSize = 20
  else if size = "sm"
    fontSize = 28
  else if size = "playing"
    fontSize = 32
  else if size = "getready"
    fontSize = 56
  else if size = "lg"
    fontSize = 64
  else if size = "lobby"
    fontSize = 72
  else if size = "xl"
    fontSize = 80
  else if size = "hero"
    fontSize = 96
  else
    ' md (default)
    fontSize = 48
  end if

  setLogoFontSize(fontSize)
end sub

sub setLogoFontSize(fontSize as Integer)
  tapFont = CreateObject("roSGNode", "Font")
  tapFont.uri = "pkg:/fonts/Fredoka-Bold.ttf"
  tapFont.size = fontSize
  m.tapLabel.font = tapFont

  triviaFont = CreateObject("roSGNode", "Font")
  triviaFont.uri = "pkg:/fonts/Fredoka-Bold.ttf"
  triviaFont.size = fontSize
  m.triviaLabel.font = triviaFont

  ' Position Trivia after Tap with normal word spacing.
  ' boundingRect() returns 0 right after the font is assigned (font loads
  ' async), so the empirical-ratio fallback below is the path that usually
  ' fires. "Tap" in Fredoka-Bold is ~1.78 × fontSize wide; +0.15 × fontSize
  ' word spacing → 1.93 total. Old 1.4 caused Trivia to overlap Tap.
  bounds = m.tapLabel.boundingRect()
  if bounds.width > 0
    m.triviaLabel.translation = [bounds.width + Int(fontSize * 0.18), 0]
  else
    m.triviaLabel.translation = [Int(fontSize * 1.93), 0]
  end if
end sub
