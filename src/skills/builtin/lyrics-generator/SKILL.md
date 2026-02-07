---
name: lyrics-generator
description: Generate professional music lyrics for songs across all genres. Creates original, emotionally resonant lyrics with proper structure, rhyme schemes, and thematic depth. Supports multiple languages, styles from pop to classical, and customizable song structures.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: creative
  tags: lyrics music songwriting composition creative writing poetry
compatibility: Works with all major music genres and supports multiple languages
---

# Professional Lyrics Generator

Creates original, emotionally resonant music lyrics with proper song structure, rhyme schemes, and thematic depth across all genres.

## When to Use

- Writing songs for personal or professional projects
- Need lyrics for specific genres (pop, rock, hip-hop, country, etc.)
- Creating concept albums with thematic consistency
- Adapting lyrics for different languages or cultures
- Exploring creative writing and poetry
- Generating placeholder lyrics for demos
- Seeking inspiration for songwriting

## Parameters

### Core Parameters

- `theme` (string, required): Main subject or emotion of the song
  - Examples: "love", "heartbreak", "friendship", "dreams", "rebellion"
  - Can be specific: "summer romance", "overcoming adversity", "city nightlife"

- `genre` (string, optional): Musical genre/style
  - "pop" - Catchy, radio-friendly (default)
  - "rock" - Energetic, guitar-driven
  - "hip-hop" / "rap" - Rhythmic, lyrical
  - "country" - Storytelling, acoustic
  - "rnb" / "soul" - Smooth, emotional
  - "edm" / "electronic" - Dance, festival
  - "folk" - Acoustic, traditional
  - "jazz" - Complex, improvisational
  - "classical" / "opera" - Dramatic, orchestral
  - "indie" - Alternative, unique
  - "metal" - Heavy, intense
  - "reggae" - Relaxed, rhythmic
  - "latin" - Passionate, rhythmic
  - "k-pop" - Korean pop style
  - "j-pop" - Japanese pop style
  - "c-pop" - Chinese pop style

### Structure Parameters

- `structure` (string, optional): Song structure format
  - "verse-chorus" - Standard pop format (default)
  - "verse-chorus-bridge" - With bridge section
  - "aaba" - Jazz standard format
  - "aaa" - Through-composed
  - "abac" - Classical rounded binary
  - "free" - No fixed structure
  - Custom: "verse-chorus-verse-chorus-bridge-chorus"

- `verses` (number, optional): Number of verses (default: 2-3)
- `length` (string, optional): Overall song length
  - "short" - 2-3 minutes (minimal sections)
  - "medium" - 3-4 minutes (standard)
  - "long" - 4-5+ minutes (extended)

### Style Parameters

- `mood` (string, optional): Emotional tone
  - "happy" / "joyful" / "upbeat"
  - "sad" / "melancholic" / "somber"
  - "angry" / "intense" / "aggressive"
  - "romantic" / "passionate" / "tender"
  - "nostalgic" / "reflective" / "contemplative"
  - "energetic" / "exciting" / "anthemic"
  - "mysterious" / "dark" / "atmospheric"
  - "empowering" / "inspiring" / "motivational"

- `tempo` (string, optional): Speed/energy level
  - "slow" - Ballad, emotional
  - "mid-tempo" - Moderate pace (default)
  - "fast" - Upbeat, energetic
  - "variable" - Changes throughout

### Technical Parameters

- `language` (string, optional): Lyrics language
  - "english" (default)
  - "chinese" / "中文"
  - "japanese" / "日本語"
  - "korean" / "한국어"
  - "spanish" / "español"
  - "french" / "français"
  - "german" / "deutsch"
  - Or any other language

- `rhymeScheme` (string, optional): Rhyme pattern
  - "aabb" - Couplets
  - "abab" - Alternate (default)
  - "abba" - Enclosed
  - "abcb" - Ballad meter
  - "aaaa" - Monorhyme
  - "free" - No strict rhyme
  - "internal" - Internal rhyming

- `complexity` (string, optional): Lyrical sophistication
  - "simple" - Easy to understand, catchy
  - "moderate" - Balanced depth (default)
  - "complex" - Rich metaphors, poetic
  - "experimental" - Avant-garde, abstract

### Content Parameters

- `keywords` (array, optional): Specific words or phrases to include
- `avoidWords` (array, optional): Words or themes to exclude
- `perspective` (string, optional): Narrative point of view
  - "first" - "I", "me", "my"
  - "second" - "you", "your"
  - "third" - "he", "she", "they"

- `storyArc` (string, optional): Narrative progression
  - "linear" - Beginning to end
  - "circular" - Returns to start
  - "progressive" - Builds intensity
  - "reflective" - Looking back

### Advanced Parameters

- `referenceArtist` (string, optional): Style similar to artist
  - Examples: "Taylor Swift", "Jay-Z", "BTS", "Ed Sheeran", "Adele"
- `referenceSong` (string, optional): Similar to specific song
- `era` (string, optional): Time period style
  - "modern" (default), "80s", "90s", "2000s", "classic", "vintage"

## Examples

### Pop Love Song

```yaml
skill: lyrics-generator
parameters:
  theme: 'summer romance'
  genre: 'pop'
  mood: 'romantic'
  structure: 'verse-chorus-bridge'
  length: 'medium'
  language: 'english'
  keywords: ['sunset', 'beach', 'dancing', 'forever']
```

**Output:**

```
[Verse 1]
Golden sunset paints the sky
We're dancing barefoot, you and I
The ocean whispers secrets low
Of a love that continues to grow

[Pre-Chorus]
Every moment feels so right
With you here by my side tonight

[Chorus]
This summer romance, never gonna end
You're more than a lover, you're my best friend
Under the stars, we'll dance forever
Two hearts together, now and ever

[Verse 2]
Beach sand stuck between our toes
The way you laugh, the way it shows
That this feeling's something real
A kind of magic we can feel

[Pre-Chorus]
Every moment feels so right
With you here by my side tonight

[Chorus]
This summer romance, never gonna end
You're more than a lover, you're my best friend
Under the stars, we'll dance forever
Two hearts together, now and ever

[Bridge]
Seasons change and time moves on
But our love remains strong
Through every storm, through every test
I know that we are blessed

[Final Chorus]
This summer romance, burning like the sun
Our journey together has just begun
Under the stars, we'll dance forever
Two hearts as one, now and ever

[Outro]
Forever... forever... you and I
```

### Hip-Hop Anthem

```yaml
skill: lyrics-generator
parameters:
  theme: 'overcoming struggle and success'
  genre: 'hip-hop'
  mood: 'empowering'
  tempo: 'fast'
  complexity: 'complex'
  structure: 'verse-chorus-verse-chorus-bridge-chorus'
  language: 'english'
  keywords: ['grind', 'hustle', 'rise', 'champion']
```

**Output:**

```
[Intro]
Yeah... let's go
From the bottom to the top
This is for everyone who's been told they can't make it

[Verse 1]
Started from the concrete jungle, no silver spoon
Had to grind while they slept, under the moon
Every "no" just fueled the fire in my chest
Turned my pain into power, now I'm at my best
They said the odds were stacked, the deck was rigged
But I flipped the script, now the crown's big
From empty pockets to filling up the vault
Every setback was just setting up the assault

[Chorus]
Rise up, rise up, we don't stay down
Wear the hustle like a crown
From the struggle to the throne
Now the world knows our name is carved in stone
Rise up, rise up, champions we are
Shining brighter than the stars
Every battle made us strong
This is where we belong

[Verse 2]
Late nights turned to early mornings, no complaints
Sacrificed it all, ignored the aches and pains
While they were partying, I was plotting moves
Building empires, breaking all the rules
The underdog story, written in real time
Every rhyme is a step up the climb
From the shadows to the spotlight's gleam
Living out the impossible dream

[Chorus]
Rise up, rise up, we don't stay down
Wear the hustle like a crown
From the struggle to the throne
Now the world knows our name is carved in stone
Rise up, rise up, champions we are
Shining brighter than the stars
Every battle made us strong
This is where we belong

[Bridge]
They counted us out, but we counted on each other
Sisters, brothers, we rise together
The grind don't stop, the hustle don't quit
We're the ones who never quit

[Verse 3]
Now they study how we did it, want the blueprint
But the secret is we never quit, that's the movement
From the mud to the marble floors
Opening up brand new doors
The champion's mindset, engraved in the soul
We're the ones who make the impossible whole

[Final Chorus]
Rise up, rise up, we don't stay down
Wear the hustle like a crown
From the struggle to the throne
Now the world knows our name is carved in stone
Rise up, rise up, champions we are
Shining brighter than the stars
Every battle made us strong
This is where we belong

[Outro]
Champions... we are the champions
Never forget where you came from
But always remember where you're going
Rise up!
```

### Chinese Ballad (中文情歌)

```yaml
skill: lyrics-generator
parameters:
  theme: 'long-distance love'
  genre: 'c-pop'
  mood: 'nostalgic'
  tempo: 'slow'
  language: 'chinese'
  structure: 'verse-chorus-verse-chorus-bridge-chorus'
```

**Output:**

```
[主歌 1]
窗外的雨下了一整夜
就像我想你的心情无法停歇
千里之外的你在做什么
是否也望着同一片天空

[导歌]
距离让我们学会珍惜
每一通电话都如此珍贵

[副歌]
虽然相隔千山万水
我的爱永远不会疲惫
等到重逢的那一天
我要紧紧拥抱你不再分离

[主歌 2]
手机里存着你的照片
每天看几遍仿佛你就在身边
时差让我们错过许多瞬间
但我的心始终与你相连

[导歌]
距离让我们学会珍惜
每一通电话都如此珍贵

[副歌]
虽然相隔千山万水
我的爱永远不会疲惫
等到重逢的那一天
我要紧紧拥抱你不再分离

[桥段]
也许现在的分离
是为了更好的相聚
我们的爱经得起考验
像星星一样永恒不变

[副歌]
虽然相隔千山万水
我的爱永远不会疲惫
等到重逢的那一天
我要紧紧拥抱你不再分离

[尾奏]
等待... 等待重逢的那一天
```

### Country Story Song

```yaml
skill: lyrics-generator
parameters:
  theme: 'small town memories'
  genre: 'country'
  mood: 'nostalgic'
  structure: 'verse-chorus-verse-chorus-bridge-chorus'
  referenceArtist: 'Johnny Cash'
  era: 'classic'
```

**Output:**

```
[Verse 1]
Dusty roads and old oak trees
Front porch swing in the summer breeze
Mama's cooking, Daddy's laugh
Photographs in an old weathered craft

[Verse 2]
Friday nights at the county fair
Cotton candy and ribbons in her hair
First kiss stolen by the old creek bend
Promised each other it would never end

[Chorus]
Small town memories, they never fade
Like the songs the old radio played
Simple times and honest hearts
That's where my story starts
Small town memories, carry me home
No matter how far I may roam

[Verse 3]
Main Street hasn't changed a bit
Same old diner where we used to sit
The folks wave like they always do
In this town, dreams still come true

[Chorus]
Small town memories, they never fade
Like the songs the old radio played
Simple times and honest hearts
That's where my story starts
Small town memories, carry me home
No matter how far I may roam

[Bridge]
City lights are bright and grand
But they don't understand
The value of a handshake and a smile
That makes life worthwhile

[Final Chorus]
Small town memories, they never fade
Like the songs the old radio played
Simple times and honest hearts
That's where my story starts
Small town memories, carry me home
No matter how far I may roam

[Outro]
Carry me home...
```

## Genre-Specific Guidelines

### Pop

- Catchy hooks and memorable choruses
- Universal themes (love, empowerment, fun)
- Simple, relatable language
- Strong melodic potential

### Hip-Hop/Rap

- Rhythmic flow and wordplay
- Storytelling and social commentary
- Internal rhymes and complex schemes
- Authentic voice and attitude

### Rock

- Energetic, anthemic choruses
- Rebellious or emotional themes
- Powerful imagery
- Driving rhythm in lyrics

### Country

- Storytelling focus
- Rural/small town imagery
- Traditional values and themes
- Acoustic-friendly language

### R&B/Soul

- Smooth, sensual language
- Emotional depth and vulnerability
- Romantic themes
- Flowing, melodic phrasing

### EDM/Electronic

- Festival-ready anthems
- Repetitive, chant-like hooks
- Energy and movement focus
- Minimal verses, maximal drops

### Folk

- Acoustic-friendly simplicity
- Traditional storytelling
- Nature and heritage themes
- Poetic but accessible

### Jazz

- Complex harmonies reflected in lyrics
- Improvisational feel
- Sophisticated vocabulary
- Abstract or romantic themes

### K-Pop

- Mix of Korean and English
- High energy and catchy hooks
- Visual and performance-oriented
- Youth culture themes

## Best Practices

### Songwriting Tips

1. **Show, Don't Tell**: Use imagery instead of stating emotions
2. **Consistent Theme**: Every line should serve the central idea
3. **Strong Hook**: Chorus should be memorable and repeatable
4. **Natural Flow**: Lyrics should feel conversational when sung
5. **Universal Appeal**: Specific details with universal emotions

### Structure Guidelines

- **Verse**: Sets scene, tells story (8-16 lines)
- **Chorus**: Main message, hook (4-8 lines)
- **Bridge**: Contrast, new perspective (4-8 lines)
- **Pre-Chorus**: Build tension (2-4 lines)

### Rhyme Techniques

- **Perfect Rhyme**: love/above, heart/apart
- **Slant Rhyme**: soul/all, time/mind
- **Internal Rhyme**: Rhymes within lines
- **Assonance**: Vowel sound matching
- **Consonance**: Consonant sound matching

## Output Format

Returns complete song lyrics with:

- Section labels ([Verse], [Chorus], etc.)
- Proper formatting for readability
- Suggested chord progressions (optional)
- Performance notes (optional)

## Notes

- Generated lyrics are original and royalty-free
- Can be refined and edited by user
- Supports multiple languages with cultural awareness
- Genre conventions are respected
- Commercial use permitted
