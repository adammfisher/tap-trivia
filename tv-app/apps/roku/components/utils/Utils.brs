' Utils — Shared utility functions for TapTrivia Roku app
' Include in XML: <script type="text/brightscript" uri="pkg:/components/utils/Utils.brs" />

function safeInt(val as Dynamic, fallback as Integer) as Integer
  if val = invalid then return fallback
  if type(val) = "Integer" or type(val) = "roInteger" or type(val) = "roInt" then return val
  if type(val) = "Float" or type(val) = "roFloat" or type(val) = "Double" or type(val) = "roDouble" then return Int(val)
  if type(val) = "String" or type(val) = "roString"
    result = val.toInt()
    if result <> 0 or val = "0" then return result
  end if
  return fallback
end function

function getEpochMs() as LongInteger
  dt = CreateObject("roDateTime")
  return dt.AsSeconds() * 1000&
end function

function formatScore(score as Integer) as String
  s = Str(score).trim()
  if score >= 1000
    ln = Len(s)
    result = ""
    for i = 0 to ln - 1
      if i > 0 and (ln - i) mod 3 = 0
        result = result + ","
      end if
      result = result + Mid(s, i + 1, 1)
    end for
    return result
  end if
  return s
end function

function formatCountdown(secsLeft as Integer) as String
  hours = Int(secsLeft / 3600)
  mins = Int((secsLeft mod 3600) / 60)
  secs = secsLeft mod 60
  if hours > 0
    return Str(hours).trim() + ":" + zeroPad(mins) + ":" + zeroPad(secs)
  end if
  if mins > 0
    return Str(mins).trim() + ":" + zeroPad(secs)
  end if
  return Str(secs).trim() + "s"
end function

function zeroPad(n as Integer) as String
  if n < 10
    return "0" + Str(n).trim()
  end if
  return Str(n).trim()
end function

function rightJustify(s as String, width as Integer, pad as String) as String
  while Len(s) < width
    s = pad + s
  end while
  return s
end function

function pointsTier(pct as Float) as String
  if pct > 0.6 then return "safe"
  if pct > 0.3 then return "warning"
  return "danger"
end function

function pointsColor(tier as String) as String
  if tier = "safe" then return "#00d4aa"
  if tier = "warning" then return "#ffd200"
  if tier = "danger" then return "#ff4757"
  return "#ffd200"
end function

' Calculate points available based on elapsed seconds in current question
' Matches scoring.js: 0-11s=1000, 11-14s=800, 14-32s=linear 800→0, 32s+=0
function calculatePointsAvailable(elapsed as Float) as Integer
  if elapsed <= 11.0 then return 1000
  if elapsed <= 14.0 then return 800
  if elapsed >= 32.0 then return 0
  ' Linear decay from 800 to 0 over 14-32s (18s window)
  return Int(800.0 * (32.0 - elapsed) / 18.0)
end function

' Returns pkg:/images/cat-{key}.png URI for a category name.
' Order: specific phrases first, broad keywords last (first match wins).
function getCategoryIconUri(category as String) as String
  if category = "" then return "pkg:/images/cat-default.png"
  c = LCase(category)
  ' ── Sport leagues (most specific) ──
  if Instr(1, c, "nhl") > 0 then return "pkg:/images/cat-nhl.png"
  if Instr(1, c, "nfl") > 0 then return "pkg:/images/cat-nfl.png"
  if Instr(1, c, "nba") > 0 then return "pkg:/images/cat-nba.png"
  if Instr(1, c, "mlb") > 0 then return "pkg:/images/cat-mlb.png"
  if Instr(1, c, "ncaa") > 0 then return "pkg:/images/cat-ncaa.png"
  if Instr(1, c, "nascar") > 0 then return "pkg:/images/cat-nascar.png"
  if Instr(1, c, "olympic") > 0 then return "pkg:/images/cat-olympics.png"
  if Instr(1, c, "soccer") > 0 then return "pkg:/images/cat-soccer.png"
  ' ── Multi-word specifics (before broad keywords) ──
  if Instr(1, c, "disney") > 0 then return "pkg:/images/cat-disney.png"
  if Instr(1, c, "pop culture") > 0 then return "pkg:/images/cat-pop-culture.png"
  if Instr(1, c, "true crime") > 0 then return "pkg:/images/cat-crime.png"
  if Instr(1, c, "social media") > 0 then return "pkg:/images/cat-socialmedia.png"
  if Instr(1, c, "road trip") > 0 then return "pkg:/images/cat-roadtrip.png"
  if Instr(1, c, "national park") > 0 then return "pkg:/images/cat-park.png"
  if Instr(1, c, "board game") > 0 or Instr(1, c, "video game") > 0 then return "pkg:/images/cat-gaming.png"
  if Instr(1, c, "human body") > 0 then return "pkg:/images/cat-biology.png"
  if Instr(1, c, "planet earth") > 0 then return "pkg:/images/cat-earth.png"
  if Instr(1, c, "world record") > 0 then return "pkg:/images/cat-weird.png"
  ' ── Specific categories (prevent wrong broad matches) ──
  if Instr(1, c, "broadway") > 0 or Instr(1, c, "theater") > 0 or Instr(1, c, "performing") > 0 then return "pkg:/images/cat-theater.png"
  if Instr(1, c, "movie") > 0 or Instr(1, c, "hollywood") > 0 or Instr(1, c, "blockbuster") > 0 then return "pkg:/images/cat-movies.png"
  if Instr(1, c, "president") > 0 then return "pkg:/images/cat-politics.png"
  if Instr(1, c, "government") > 0 or Instr(1, c, "constitution") > 0 then return "pkg:/images/cat-government.png"
  if Instr(1, c, "beer") > 0 or Instr(1, c, "wine") > 0 or Instr(1, c, "cocktail") > 0 then return "pkg:/images/cat-beer.png"
  if Instr(1, c, "biology") > 0 then return "pkg:/images/cat-biology.png"
  if Instr(1, c, "chemistry") > 0 or Instr(1, c, "physics") > 0 then return "pkg:/images/cat-chemistry.png"
  if Instr(1, c, "brand") > 0 or Instr(1, c, "advertising") > 0 then return "pkg:/images/cat-brand.png"
  if Instr(1, c, "building") > 0 or Instr(1, c, "architecture") > 0 then return "pkg:/images/cat-building.png"
  if Instr(1, c, "fashion") > 0 then return "pkg:/images/cat-fashion.png"
  if Instr(1, c, "holiday") > 0 or Instr(1, c, "tradition") > 0 then return "pkg:/images/cat-holiday.png"
  if Instr(1, c, "decade") > 0 or Instr(1, c, "nostalgia") > 0 then return "pkg:/images/cat-decade.png"
  if Instr(1, c, "medicine") > 0 or Instr(1, c, "health") > 0 then return "pkg:/images/cat-medicine.png"
  if Instr(1, c, "river") > 0 or Instr(1, c, "mountain") > 0 then return "pkg:/images/cat-mountain.png"
  if Instr(1, c, "ocean") > 0 then return "pkg:/images/cat-ocean.png"
  if Instr(1, c, "bible") > 0 or Instr(1, c, "religion") > 0 then return "pkg:/images/cat-religion.png"
  if Instr(1, c, "celebrity") > 0 then return "pkg:/images/cat-celebrity.png"
  if Instr(1, c, "wrestling") > 0 or Instr(1, c, "combat") > 0 then return "pkg:/images/cat-wrestling.png"
  if Instr(1, c, "crime") > 0 or Instr(1, c, "infamous") > 0 then return "pkg:/images/cat-crime.png"
  if Instr(1, c, "weird") > 0 then return "pkg:/images/cat-weird.png"
  if Instr(1, c, "travel") > 0 or Instr(1, c, "famous cities") > 0 then return "pkg:/images/cat-travel.png"
  if Instr(1, c, "business") > 0 or Instr(1, c, "entrepreneur") > 0 then return "pkg:/images/cat-business.png"
  if Instr(1, c, "invention") > 0 then return "pkg:/images/cat-invention.png"
  if Instr(1, c, "environment") > 0 then return "pkg:/images/cat-earth.png"
  if Instr(1, c, "weather") > 0 then return "pkg:/images/cat-weather.png"
  if Instr(1, c, "geology") > 0 then return "pkg:/images/cat-geology.png"
  if Instr(1, c, "streaming") > 0 or Instr(1, c, "television") > 0 then return "pkg:/images/cat-tv.png"
  if Instr(1, c, "song") > 0 or Instr(1, c, "lyric") > 0 or Instr(1, c, "album") > 0 then return "pkg:/images/cat-music.png"
  if Instr(1, c, "computer") > 0 or Instr(1, c, "internet") > 0 then return "pkg:/images/cat-technology.png"
  if Instr(1, c, "landmark") > 0 then return "pkg:/images/cat-landmark.png"
  if Instr(1, c, "flag") > 0 then return "pkg:/images/cat-flag.png"
  ' ── Broad categories (last — fallback matches) ──
  if Instr(1, c, "science") > 0 then return "pkg:/images/cat-science.png"
  if Instr(1, c, "history") > 0 then return "pkg:/images/cat-history.png"
  if Instr(1, c, "geography") > 0 then return "pkg:/images/cat-geography.png"
  if Instr(1, c, "sport") > 0 then return "pkg:/images/cat-sports.png"
  if Instr(1, c, "entertain") > 0 then return "pkg:/images/cat-entertainment.png"
  if Instr(1, c, "music") > 0 then return "pkg:/images/cat-music.png"
  if Instr(1, c, "art") > 0 then return "pkg:/images/cat-art.png"
  if Instr(1, c, "literature") > 0 then return "pkg:/images/cat-literature.png"
  if Instr(1, c, "tech") > 0 then return "pkg:/images/cat-technology.png"
  if Instr(1, c, "nature") > 0 then return "pkg:/images/cat-nature.png"
  if Instr(1, c, "food") > 0 or Instr(1, c, "dining") > 0 then return "pkg:/images/cat-food.png"
  if Instr(1, c, "tv") > 0 then return "pkg:/images/cat-tv.png"
  if Instr(1, c, "gaming") > 0 then return "pkg:/images/cat-gaming.png"
  if Instr(1, c, "animal") > 0 or Instr(1, c, "wildlife") > 0 then return "pkg:/images/cat-animals.png"
  if Instr(1, c, "math") > 0 or Instr(1, c, "number") > 0 or Instr(1, c, "logic") > 0 then return "pkg:/images/cat-math.png"
  if Instr(1, c, "politic") > 0 then return "pkg:/images/cat-politics.png"
  if Instr(1, c, "space") > 0 or Instr(1, c, "astrono") > 0 then return "pkg:/images/cat-space.png"
  if Instr(1, c, "myth") > 0 or Instr(1, c, "folklore") > 0 then return "pkg:/images/cat-mythology.png"
  if Instr(1, c, "language") > 0 or Instr(1, c, "word") > 0 or Instr(1, c, "phrase") > 0 then return "pkg:/images/cat-language.png"
  return "pkg:/images/cat-default.png"
end function

' Small (48px) version of category icon for pills
function getCategoryIconSmallUri(category as String) as String
  uri = getCategoryIconUri(category)
  parts = uri.Split("cat-")
  if parts.count() = 2
    return parts[0] + "cat-sm-" + parts[1]
  end if
  return "pkg:/images/cat-sm-default.png"
end function
