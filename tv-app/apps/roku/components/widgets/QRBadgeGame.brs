' QRBadgeGame — in-game QR badge (matches web qrBadgeHTML('bl'))

sub init()
  m.codeLabel = m.top.findNode("codeLabel")
  fixAllLabelFonts(m.top)
end sub

sub onBarCodeChanged(event as Object)
  m.codeLabel.text = event.getData()
end sub
