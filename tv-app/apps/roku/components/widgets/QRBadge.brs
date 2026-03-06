' QRBadge — Small QR code badge with join info
' Used on GetReady, Category, Playing, Reveal screens

sub init()
  m.codeLabel = m.top.findNode("codeLabel")
end sub

sub onBarCodeChanged(event as Object)
  m.codeLabel.text = event.getData()
end sub
