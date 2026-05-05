' SetupScreen — Split panel: Register (left) | Activate (right)
' Matches app.js renderSetup() behavior

sub init()
  #if DEBUG
  print ">>> SetupScreen.init() START"
  #end if
  ' ── State ──
  m.regState = "form"       ' form | sending | sent
  m.codeState = "input"     ' input | verifying | activated | error
  m.codeStr = ""
  m.codeAutoFilled = false
  m.locName = ""
  m.emailStr = ""
  m.focusArea = "left"      ' left | right
  m.focusField = "loc"      ' loc | email | regBtn | codeInput | activateBtn

  ' ── Node refs ──
  m.locLabel = m.top.findNode("locLabel")
  m.locValue = m.top.findNode("locValue")
  m.emailLabel = m.top.findNode("emailLabel")
  m.emailValue = m.top.findNode("emailValue")
  m.regBtnGroup = m.top.findNode("regBtnGroup")
  m.regBtn = m.top.findNode("regBtn")
  m.sendingState = m.top.findNode("sendingState")
  m.sentState = m.top.findNode("sentState")
  m.features = m.top.findNode("features")
  m.signageCallout = m.top.findNode("signageCallout")
  m.locFieldGroup = m.top.findNode("locFieldGroup")
  m.emailFieldGroup = m.top.findNode("emailFieldGroup")

  m.codeFieldGroup = m.top.findNode("codeFieldGroup")
  m.codeFieldBg = m.top.findNode("codeFieldBg")
  m.codeLabel = m.top.findNode("codeLabel")
  m.codeValue = m.top.findNode("codeValue")

  m.activateBtnGroup = m.top.findNode("activateBtnGroup")
  m.activateBtn = m.top.findNode("activateBtn")
  m.activateBtnLabel = m.top.findNode("activateBtnLabel")
  m.errorMsg = m.top.findNode("errorMsg")
  m.lostCodeHint = m.top.findNode("lostCodeHint")
  m.activatedState = m.top.findNode("activatedState")
  m.activatedDesc = m.top.findNode("activatedDesc")
  m.codeBadge = m.top.findNode("codeBadge")
  m.codeBadgeBg = m.top.findNode("codeBadgeBg")
  m.codeBadgeText = m.top.findNode("codeBadgeText")
  m.activateDesc = m.top.findNode("activateDesc")
  m.codeHintGroup = m.top.findNode("codeHintGroup")
  m.leftPanel = m.top.findNode("leftPanel")
  m.rightPanel = m.top.findNode("rightPanel")

  ' Settings modal — only show on first use (no saved bar code)
  m.settingsModal = m.top.findNode("settingsModal")
  sec = CreateObject("roRegistrySection", "TapTrivia")
  if sec.Exists("barCode") and sec.Read("barCode") <> ""
    m.modalVisible = false
  else
    m.settingsModal.visible = true
    m.modalVisible = true
  end if

  ' ── Set fonts from BRS (XML <Font> children not rendering) ──
  #if DEBUG
  print ">>> SetupScreen.init() about to fixAllLabelFonts"
  #end if
  fixAllLabelFonts(m.top)
  #if DEBUG
  print ">>> SetupScreen.init() fixAllLabelFonts done, about to applyAllFonts"
  #end if
  applyAllFonts()
  #if DEBUG
  print ">>> SetupScreen.init() applyAllFonts done, about to updateFocusVisuals"
  #end if

  updateFocusVisuals()
  #if DEBUG
  print ">>> SetupScreen.init() COMPLETE"
  #end if
end sub

sub onResetToInput()
  if not m.top.resetToInput then return
  #if DEBUG
  print ">>> SetupScreen.onResetToInput() — resetting all state"
  #end if
  m.regState = "form"
  m.codeState = "input"
  m.codeStr = ""
  m.codeAutoFilled = false
  m.locName = ""
  m.emailStr = ""
  m.focusArea = "right"
  m.focusField = "codeInput"

  ' Reset UI visibility
  m.sendingState.visible = false
  m.sentState.visible = false
  m.activatedState.visible = false
  m.errorMsg.visible = false

  ' Show form elements
  m.locFieldGroup.visible = true
  m.emailFieldGroup.visible = true
  m.features.visible = true
  m.signageCallout.visible = true
  m.regBtnGroup.visible = true
  m.codeFieldGroup.visible = true
  m.activateBtnGroup.visible = true
  m.codeHintGroup.visible = true
  m.lostCodeHint.visible = true

  ' Clear text values
  m.locValue.text = ""
  m.emailValue.text = ""
  m.codeValue.text = ""
  m.locLabel.visible = true
  m.emailLabel.visible = true
  m.codeLabel.visible = true

  updateCodeDisplay()
  updateFocusVisuals()
end sub

sub applyAllFonts()
  fredoka48 = makeFont("Fredoka-Bold", 48)
  fredoka36 = makeFont("Fredoka-Bold", 36)
  outfitSB18 = makeFont("Outfit-SemiBold", 18)
  outfitBold22 = makeFont("Outfit-Bold", 22)
  outfitReg22 = makeFont("Outfit-Regular", 22)

  ' Header
  logoTap = m.top.findNode("logoTap")
  if logoTap <> invalid then logoTap.font = fredoka48
  logoTrivia = m.top.findNode("logoTrivia")
  if logoTrivia <> invalid then logoTrivia.font = fredoka48

  ' Left panel titled labels
  regTitle = m.top.findNode("regTitle")
  if regTitle <> invalid then regTitle.font = fredoka36
  regDesc = m.top.findNode("regDesc")
  if regDesc <> invalid then regDesc.font = outfitReg22

  m.locLabel.font = outfitReg22
  m.locValue.font = outfitReg22
  m.emailLabel.font = outfitReg22
  m.emailValue.font = outfitReg22

  ' Right panel
  m.codeBadgeText.font = outfitSB18
  m.activateBtnLabel.font = outfitBold22
  m.codeValue.font = makeFont("DMMono-Regular", 22)
end sub

' makeFont() is provided by FontFix.brs

sub onGameStateChanged(event as Object)
  ' Not used directly — setup screen is driven by user input
end sub

sub onRegisterResult(event as Object)
  result = event.getData()
  if result = invalid then return

  if result.error <> invalid
    ' Registration failed — go back to form
    m.regState = "form"
    updateRegisterUI()
    return
  end if

  ' Success — auto-fill code
  if result.barCode <> invalid
    m.codeStr = UCase(result.barCode)
    m.codeAutoFilled = true
    updateCodeDisplay()
  end if

  m.regState = "sent"
  updateRegisterUI()

  ' Switch focus to activate button
  m.focusArea = "right"
  m.focusField = "activateBtn"
  updateFocusVisuals()
end sub

sub onActivateResult(event as Object)
  result = event.getData()
  if result = invalid then return

  if result.error <> invalid
    ' Activation failed
    m.codeState = "error"
    m.errorMsg.visible = true
    if not m.codeAutoFilled
      m.codeStr = ""
      updateCodeDisplay()
    end if
    m.activateBtn.uri = "pkg:/images/btn-green.png"
    m.activateBtnLabel.text = "Activate This TV"
    return
  end if

  ' Success — show "You're Live!"
  m.codeState = "activated"
  showActivatedState(result)
end sub

sub showActivatedState(result as Object)
  ' Hide normal right panel elements
  m.codeFieldGroup.visible = false
  m.activateBtnGroup.visible = false
  m.lostCodeHint.visible = false
  m.errorMsg.visible = false
  m.codeBadge.visible = false
  m.activateDesc.visible = false
  m.codeHintGroup.visible = false

  ' Show activated state
  m.activatedState.visible = true
  displayName = m.locName
  if displayName = "" and result.barName <> invalid
    displayName = result.barName
  end if
  if displayName = "" then displayName = "Your location"
  m.activatedDesc.text = displayName + " is now connected. Trivia starts here."
end sub

sub updateRegisterUI()
  if m.regState = "form"
    m.locFieldGroup.visible = true
    m.emailFieldGroup.visible = true
    m.signageCallout.visible = true
    m.features.visible = true
    m.regBtnGroup.visible = true
    m.sendingState.visible = false
    m.sentState.visible = false
  else if m.regState = "sending"
    m.locFieldGroup.visible = false
    m.emailFieldGroup.visible = false
    m.signageCallout.visible = false
    m.features.visible = false
    m.regBtnGroup.visible = false
    m.sendingState.visible = true
    m.sentState.visible = false
  else if m.regState = "sent"
    m.locFieldGroup.visible = false
    m.emailFieldGroup.visible = false
    m.signageCallout.visible = false
    m.features.visible = false
    m.regBtnGroup.visible = false
    m.sendingState.visible = false
    m.sentState.visible = true
  end if
end sub

sub updateCodeDisplay()
  m.codeValue.text = m.codeStr
  if m.codeStr <> ""
    m.codeLabel.visible = false
  else
    m.codeLabel.visible = true
  end if
end sub

sub updateFocusVisuals()
  ' ── Left panel ── (swap Poster URIs for focus states)
  locFieldUri = "pkg:/images/input-field-bg.png"
  emailFieldUri = "pkg:/images/input-field-bg.png"
  regBtnUri = "pkg:/images/btn-gold.png"
  leftPanelUri = "pkg:/images/setup-panel-bg.png"

  if m.focusArea = "left"
    leftPanelUri = "pkg:/images/setup-panel-bg-focused.png"
    if m.focusField = "loc"
      locFieldUri = "pkg:/images/input-field-bg-focused.png"
    else if m.focusField = "email"
      emailFieldUri = "pkg:/images/input-field-bg-focused.png"
    else if m.focusField = "regBtn"
      regBtnUri = "pkg:/images/btn-gold-focused.png"
    end if
  end if

  m.leftPanel.getChild(0).uri = leftPanelUri
  m.locFieldGroup.getChild(0).uri = locFieldUri
  m.emailFieldGroup.getChild(0).uri = emailFieldUri
  m.regBtn.uri = regBtnUri

  ' ── Right panel ──
  rightPanelUri = "pkg:/images/setup-panel-bg.png"

  if m.focusArea = "right"
    rightPanelUri = "pkg:/images/setup-panel-bg-focused.png"
    if m.focusField = "activateBtn"
      m.activateBtn.uri = "pkg:/images/btn-green-focused.png"
    else
      m.activateBtn.uri = "pkg:/images/btn-green.png"
    end if
  else
    m.activateBtn.uri = "pkg:/images/btn-green.png"
  end if

  m.rightPanel.getChild(0).uri = rightPanelUri

  ' ── Code field focus highlight ──
  if m.focusArea = "right" and m.focusField = "codeInput"
    m.codeFieldBg.uri = "pkg:/images/input-field-bg-focused.png"
  else
    m.codeFieldBg.uri = "pkg:/images/input-field-bg.png"
  end if
end sub

sub doRegister()
  if m.locName = "" then return
  m.regState = "sending"
  updateRegisterUI()

  scene = m.top.getScene()
  body = caseSensitiveAA()
  body["barName"] = m.locName
  if m.emailStr <> ""
    body["ownerEmail"] = m.emailStr
  end if
  scene.callFunc("makeApiCall", "POST", "/bar/register", body, "registerBar")
end sub

sub doActivate()
  code = UCase(m.codeStr)
  if Len(code) < 5 then return

  m.codeState = "verifying"
  m.activateBtn.uri = "pkg:/images/btn-green-verifying.png"
  m.activateBtnLabel.text = "Activating..."

  scene = m.top.getScene()
  body = caseSensitiveAA()
  body["barCode"] = code
  ' Roku ships a stable per-channel device id; backend persists it as tv_id.
  tvId = scene.getField("tvDeviceId")
  if tvId <> invalid and tvId <> ""
    body["tvId"] = tvId
  end if
  body["tvPlatform"] = "roku"
  scene.callFunc("makeApiCall", "POST", "/tv/activate", body, "activateTV")
end sub

function caseSensitiveAA() as Object
  aa = CreateObject("roAssociativeArray")
  aa.SetModeCaseSensitive()
  return aa
end function

function onKeyEvent(key as String, press as Boolean) as Boolean
  if press
    #if DEBUG
    print ">>> SetupScreen.onKeyEvent: key=" + key + " press=true"
    #end if
  end if
  if not press then return false

  ' Settings modal — dismiss with OK, block all other input while visible
  if m.modalVisible
    if key = "OK"
      m.settingsModal.visible = false
      m.modalVisible = false
    end if
    return true
  end if

  if m.codeState = "activated" then return false

  ' Navigation between panels
  if key = "right"
    if m.focusArea = "left"
      m.focusArea = "right"
      m.focusField = "codeInput"
      updateFocusVisuals()
      return true
    end if
  else if key = "left"
    if m.focusArea = "right"
      m.focusArea = "left"
      m.focusField = "loc"
      updateFocusVisuals()
      return true
    end if
  end if

  ' Vertical navigation
  if key = "down"
    if m.focusArea = "left"
      if m.focusField = "loc"
        m.focusField = "email"
      else if m.focusField = "email"
        m.focusField = "regBtn"
      end if
    else if m.focusArea = "right"
      if m.focusField = "codeInput"
        m.focusField = "activateBtn"
      end if
    end if
    updateFocusVisuals()
    return true
  else if key = "up"
    if m.focusArea = "left"
      if m.focusField = "regBtn"
        m.focusField = "email"
      else if m.focusField = "email"
        m.focusField = "loc"
      end if
    else if m.focusArea = "right"
      if m.focusField = "activateBtn"
        m.focusField = "codeInput"
      end if
    end if
    updateFocusVisuals()
    return true
  end if

  ' OK/Select
  if key = "OK"
    if m.focusField = "regBtn"
      doRegister()
      return true
    else if m.focusField = "activateBtn"
      doActivate()
      return true
    else if m.focusField = "loc" or m.focusField = "email" or m.focusField = "codeInput"
      openKeyboard()
      return true
    end if
  end if

  ' Direct character input for code field
  if m.focusField = "codeInput"
    if Left(key, 4) = "Lit_" and Len(key) = 5
      ' Letter or digit typed
      ch = Mid(key, 5, 1)
      if Len(m.codeStr) < 5
        m.codeStr = m.codeStr + UCase(ch)
        m.errorMsg.visible = false
        updateCodeDisplay()
        #if DEBUG
        print ">>> Code input: " + m.codeStr
        #end if
      end if
      return true
    end if
    if key = "replay"
      ' Replay clears all characters at once
      if Len(m.codeStr) > 0
        m.codeStr = ""
        m.errorMsg.visible = false
        updateCodeDisplay()
        return true
      end if
    end if
    if key = "back"
      ' Backspace: delete last character
      if Len(m.codeStr) > 0
        m.codeStr = Left(m.codeStr, Len(m.codeStr) - 1)
        updateCodeDisplay()
        return true
      end if
      ' If empty, navigate left
      m.focusArea = "left"
      m.focusField = "loc"
      updateFocusVisuals()
      return true
    end if
  end if

  return false
end function

sub openKeyboard()
  #if DEBUG
  print ">>> openKeyboard() called for field: " + m.focusField
  #end if
  scene = m.top.getScene()
  dialog = CreateObject("roSGNode", "StandardKeyboardDialog")
  if dialog = invalid
    #if DEBUG
    print ">>> ERROR: StandardKeyboardDialog creation returned invalid!"
    #end if
    return
  end if
  if m.focusField = "loc"
    dialog.title = "Location Name"
    dialog.text = m.locName
  else if m.focusField = "email"
    dialog.title = "Email Address"
    dialog.text = m.emailStr
  else if m.focusField = "codeInput"
    dialog.title = "Enter 5-Character Code"
    dialog.text = m.codeStr
  end if
  dialog.buttons = ["OK", "Cancel"]
  dialog.observeField("buttonSelected", "onKeyboardButton")
  m.keyboardDialog = dialog
  scene.dialog = dialog
  #if DEBUG
  print ">>> openKeyboard() dialog set on scene"
  #end if
end sub

sub onKeyboardButton()
  dialog = m.keyboardDialog
  if dialog = invalid then return
  if dialog.buttonSelected = 0 ' OK
    if m.focusField = "loc"
      m.locName = dialog.text
      m.locValue.text = m.locName
      m.locLabel.visible = (m.locName = "")
    else if m.focusField = "email"
      m.emailStr = dialog.text
      m.emailValue.text = m.emailStr
      m.emailLabel.visible = (m.emailStr = "")
    else if m.focusField = "codeInput"
      m.codeStr = UCase(Left(dialog.text, 5))
      m.errorMsg.visible = false
      updateCodeDisplay()
      ' Auto-activate if 5 chars entered
      if Len(m.codeStr) >= 5
        m.top.getScene().dialog = invalid
        m.focusField = "activateBtn"
        updateFocusVisuals()
        doActivate()
        return
      end if
    end if
  end if
  m.top.getScene().dialog = invalid
end sub
