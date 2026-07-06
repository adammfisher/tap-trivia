sub init()
  m.codeLabel = m.top.findNode("codeLabel")
  fixAllLabelFonts(m.top)
end sub

sub onBarCodeChanged()
  m.codeLabel.text = m.top.barCode
end sub
