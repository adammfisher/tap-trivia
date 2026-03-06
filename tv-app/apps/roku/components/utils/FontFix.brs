' FontFix.brs — Shared font utility
' Roku <Font role="font"> XML children may not render text on all devices.
' This walks the node tree and explicitly assigns fonts from BRS.

sub fixAllLabelFonts(node as Object)
  if node = invalid then return
  for i = 0 to node.getChildCount() - 1
    child = node.getChild(i)
    if child <> invalid
      if child.subtype() = "Label"
        if child.font <> invalid
          ' Font was set (possibly by role mechanism) — recreate from BRS
          oldFont = child.font
          nf = CreateObject("roSGNode", "Font")
          nf.uri = oldFont.uri
          nf.size = oldFont.size
          child.font = nf
        else
          ' Font not set — look for Font child node
          fontSet = false
          for j = 0 to child.getChildCount() - 1
            fc = child.getChild(j)
            if fc <> invalid and fc.subtype() = "Font"
              nf = CreateObject("roSGNode", "Font")
              nf.uri = fc.uri
              nf.size = fc.size
              child.font = nf
              fontSet = true
              exit for
            end if
          end for
          if not fontSet
            ' Fallback: default font
            child.font = makeFont("Outfit-Regular", 22)
          end if
        end if
      end if
      fixAllLabelFonts(child)
    end if
  end for
end sub

function makeFont(name as String, size as Integer) as Object
  f = CreateObject("roSGNode", "Font")
  f.uri = "pkg:/fonts/" + name + ".ttf"
  f.size = size
  return f
end function
