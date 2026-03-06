' OrbBackground — Floating gradient orbs for ambient background animation
' Matches the web app's floating orb effect with slow translate+scale cycles

sub init()
  ' Start animations
  m.top.findNode("orb1Anim").control = "start"
  m.top.findNode("orb2Anim").control = "start"
  m.top.findNode("orb3Anim").control = "start"
end sub

sub onActiveChanged(event as Object)
  if event.getData()
    m.top.findNode("orb1Anim").control = "resume"
    m.top.findNode("orb2Anim").control = "resume"
    m.top.findNode("orb3Anim").control = "resume"
  else
    m.top.findNode("orb1Anim").control = "pause"
    m.top.findNode("orb2Anim").control = "pause"
    m.top.findNode("orb3Anim").control = "pause"
  end if
end sub
