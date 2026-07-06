' CategoryScreen — Category reveal between questions
' Matches app.js renderCategory() behavior

sub init()
  ' ── Node refs ──
  m.barNameLabel = m.top.findNode("barNameLabel")
  m.questionCounter = m.top.findNode("questionCounter")
  m.categoryIcon = m.top.findNode("categoryIcon")
  m.categoryName = m.top.findNode("categoryName")
  m.subcategoryName = m.top.findNode("subcategoryName")
  m.diffLabel = m.top.findNode("diffLabel")
  m.difficultyRow = m.top.findNode("difficultyRow")
  m.qrBadge = m.top.findNode("qrBadge")

  ' Difficulty dots (filled)
  m.dot1 = m.top.findNode("dot1")
  m.dot2 = m.top.findNode("dot2")
  m.dot3 = m.top.findNode("dot3")

  ' (empty dot nodes removed — web only shows filled dots)

  ' Animations
  m.categoryZoomAnim = m.top.findNode("categoryZoomAnim")
  m.nameFadeAnim = m.top.findNode("nameFadeAnim")
  m.diffFadeAnim = m.top.findNode("diffFadeAnim")

  ' Re-layout timer (re-measure category height once the label has rendered)
  m.layoutTimer = m.top.findNode("layoutTimer")
  m.layoutTimer.observeField("fire", "onLayoutTimer")

  m.lastCategory = ""
  m.catFontSize = 84
  m.hasSubcat = false

  fixAllLabelFonts(m.top)
end sub

sub onGameStateChanged(event as Object)
  state = event.getData()
  if state = invalid then return

  ' Update bar name
  bName = m.top.getField("barName")
  if bName <> invalid and bName <> ""
    m.barNameLabel.text = bName
  end if

  ' Update bar code on QR badge
  bCode = m.top.getField("barCode")
  if bCode <> invalid and bCode <> ""
    m.qrBadge.setField("barCode", bCode)
  end if

  ' Extract question data
  q = state.question
  if q = invalid then q = {}

  ' Question counter
  num = 1
  total = 15
  if state.questionNumber <> invalid then num = safeInt(state.questionNumber, 1)
  if state.totalQuestions <> invalid then total = safeInt(state.totalQuestions, 15)
  m.questionCounter.text = "QUESTION " + Str(num).trim() + " OF " + Str(total).trim()

  ' Category name
  category = "Trivia"
  if q.category <> invalid and q.category <> ""
    category = q.category
  else if state.category <> invalid and state.category <> ""
    category = state.category
  end if

  ' Show full category name — reduce font size for long names
  m.categoryName.text = category
  catLen = Len(category)
  if catLen > 40
    fsize = 52
  else if catLen > 30
    fsize = 64
  else if catLen > 20
    fsize = 74
  else
    fsize = 84
  end if
  m.categoryName.font = makeFont("Fredoka-Bold", fsize)
  m.catFontSize = fsize

  ' Category icon (pre-rendered emoji PNG)
  m.categoryIcon.uri = getCategoryIconUri(category)

  ' Subcategory
  sub_cat = ""
  if q.subcategory <> invalid then sub_cat = q.subcategory
  if sub_cat = "" and state.subcategory <> invalid then sub_cat = state.subcategory
  m.subcategoryName.text = sub_cat
  m.hasSubcat = (sub_cat <> "")
  m.subcategoryName.visible = m.hasSubcat

  ' Position subtitle + difficulty directly under the category name. Done once
  ' now (estimate) and again after the label lays out (exact boundingRect), so
  ' the gap stays tight whether the name is one or two lines — like web's flow.
  positionCategoryBlock()
  m.layoutTimer.control = "start"

  ' Difficulty (1-3)
  diff = 3
  if q.difficulty <> invalid then diff = safeInt(q.difficulty, 3)
  if state.difficulty <> invalid then diff = safeInt(state.difficulty, diff)
  if diff < 1 then diff = 1
  if diff > 3 then diff = 3

  updateDifficulty(diff)

  ' Trigger animations if category changed
  if category <> m.lastCategory
    m.lastCategory = category
    m.categoryZoomAnim.control = "start"
    m.nameFadeAnim.control = "start"
    m.diffFadeAnim.control = "start"
  end if
end sub

sub onLayoutTimer()
  positionCategoryBlock()
end sub

' Place the subtitle 16px below the category name's actual rendered bottom
' (web .tt-category__name margin-bottom), and the difficulty row below that.
sub positionCategoryBlock()
  catTop = 312
  h = 0
  rect = m.categoryName.boundingRect()
  if rect <> invalid and rect.height <> invalid then h = rect.height
  if h <= 0
    ' boundingRect not ready yet — estimate from length + chosen font size
    fsize = m.catFontSize
    cpl = Int(1400 / (fsize * 0.52))
    if cpl < 1 then cpl = 1
    lines = Int((Len(m.categoryName.text) - 1) / cpl) + 1
    if lines < 1 then lines = 1
    if lines > 2 then lines = 2
    h = lines * Int(fsize * 1.2)
  end if

  subY = catTop + h + 16
  m.subcategoryName.translation = [0, subY]
  if m.hasSubcat
    m.difficultyRow.translation = [0, subY + 70]
  else
    m.difficultyRow.translation = [0, subY + 10]
  end if
end sub

sub updateDifficulty(level as Integer)
  ' Labels
  labels = ["", "Easy", "Medium", "Hard"]
  m.diffLabel.text = labels[level]

  ' Web uses muted white for label, green dots for all levels
  m.diffLabel.color = "#ffffff66"

  ' Show filled dots up to level (always green)
  m.dot1.visible = (level >= 1)
  m.dot2.visible = (level >= 2)
  m.dot3.visible = (level >= 3)
end sub

