# Speaker Notes

Extracted from [`demo-copy.html`](demo-copy.html).

## Slide 1: Beyond the Timeline

Hi everyone, I'm Valentina Shin. Today I'm going to talk about going beyond the timeline — rethinking how we author and structure video.

---

## Slide 2

Play the clip full screen if your setup allows. It is trimmed to a short beat; let it land, then advance. If the file fails, summarize verbally: generative models are changing how moving images get made, which motivates the rest of the talk.

---

## Slide 3

"Who knows this movie?" [Pause for audience]
Three Little Pigs, 1933 Disney. What is less well known is how this animated short was a breakthrough in animation technology. This film marked a major leap in production technique. It was the first cartoon to be fully storyboarded beat for beat — a technique credited to story man Webb Smith.

---

## Slide 4

Here you can see the actual story sketches from the production — Scene I, II, III all planned out on paper. And on the right, this is what a story meeting looked like at the Disney studio. The whole team gathered around a board, discussing the structure of the film before a single frame was animated. The first story to be storyboarded. It was the first time an animated cartoon was fully planned out beat for beat.

---

## Slide 5: Storyboarding becomes industry standard

"So what happened after Three Little Pigs?"
[CLICK] In 1933, Walt Disney established the studio's first dedicated Story Department.
[CLICK] By 1938, every major American animation studio had a dedicated story department. It spread incredibly fast.
[CLICK] And it wasn't just animation. In 1939, William Cameron Menzies used storyboards to plan every single shot of Gone with the Wind.
[CLICK] And then you have Hitchcock, who took it even further. In a 1969 interview with Roger Ebert he said: "Once the screenplay is finished, I'd just as soon not make the film at all. I have a strongly visual mind. I visualize a picture right down to the final cuts."
So why was storyboarding so important? Three reasons:
One — it allowed you to look at the entire structure of a film at once.
Two — it acts as an intermediate artifact you can iterate on cheaply.
Three — it expresses the most important semantics: the shot angle, the beat, the emotion, the character.

---

## Slide 6: A storyboard…

So, why was Webb Smith's bulletin board so revolutionary? It did three things: First, it allowed creators to think in semantic units — "the wolf blows the house down" — rather than individual frames. Second, it created a shared reference point for the whole studio to communicate. And third, because of the thumbtacks, it became a flexible substrate for rapid iteration.

---

## Slide 7

But a funny thing happened when we transitioned to digital video authoring. We lost the bulletin board. Today, our most powerful tools drag us right back down to the lowest level of abstraction.

---

## Slide 8

We are forced to manipulate raw pixels, keyframes, and strict timecodes. I call this the Representation Gap: the mismatch between how humans naturally think about media — in narratives and structures — and how computers force us to edit it.

---

## Slide 9: Translate high-level creative intent into algorithms or operations.

The first thread of my work is supporting semantics: closing the gap between what creators mean and what software can act on. I will walk through our UIST twenty-three paper on automated lyric videos as a concrete example. There we took a natural-language-style intent, such as showing lyrics in sync and in harmony with the picture, and turned it into a pipeline grounded in explicit design guidelines for readability and attention.

---

## Slide 10

I will ground this in our UIST twenty-three work on automated conversion of music videos into lyric videos. Lyric videos sync readable text with the song and the picture; they are now standard for artists and fans alike. The hard part is not typing words on screen, but coordinating timing, line breaks, and placement so the text stays legible and the viewer’s attention stays unified with the performance.

---

## Slide 11

This is how a creator thinks about a lyric video — a single, high-level intention. But to actually produce it, they must translate that into dozens of low-level operations: segmenting text, positioning bounding boxes, aligning timestamps, picking colors, and setting keyframes. This is the representation gap — what Don Norman called the Gulf of Execution.

---

## Slide 12

This is a short auto-animate beat between slides: we hold on the same high-level intent before unpacking it. You can advance quickly if you are tight on time; the next slides split that intent into temporal structure and spatial placement, matching how we separated design concerns in the paper.

---

## Slide 13

The temporal half of the intent is readable segments: lyrics should land in sync with the song, in chunks people can actually read. In the UIST pipeline that is a first-stage text treatment. We align words to audio with AutoLyrixAlign, group words into phrases when gaps stay within a beat so phrasing follows the music, guideline one, then break overlong phrases into lines near a median length for readability, guideline two. When the final figure is in place, use it to point at those two guidelines in one glance.

---

## Slide 14

Now the spatial half: “naturally within the scene.” In the paper we operationalize that with four energies over the frames each lyric phrase spans: avoid covering the main subject, stay near where viewers already look, keep contrast with the background, and stay close to where the previous phrase sat. Each term is computed from the same stack of frames, then combined with weights and minimized. That is the semantic bridge: one sentence of intent becomes a weighted objective the solver can run.

---

## Slide 15

Here is output from the full pipeline: same design guidelines for readability and unified focus of attention, applied end to end. In the user study, viewers rated these outputs well on reading ease and on keeping attention with the song and picture; use that if someone asks how we know it works.

---

## Slide 16: Enable common ground between humans, and between humans and AI.

That closes the lyric-video thread. Next theme is shared references: building common ground between people, and between people and models, so coordination does not depend on everyone staring at the same raw pixels.

---

## Slide 17: People communicate by establishing common ground

When people coordinate, they rely on common ground: mutual knowledge that each side knows the other knows. A storyboard in a room full of artists is a classic example; everyone can point at the same panel. Live streaming revives that need at scale: thousands of viewers reacting to the same moving image in real time.

---

## Slide 18

Chat is the default channel, but it is almost entirely text in a side column. That is fine for emotes and short reactions; it is a weak match when viewers want to refer to something specific on the video itself.

---

## Slide 19: The problem with live stream interaction

Three friction points we heard in prior work and in our own studies: plain text makes deictic references clumsy; network delay breaks conversational rhythm; and performing while monitoring a firehose of chat is cognitively expensive. These set up why we need a richer shared reference than scrolling text alone.

---

## Slide 20

Snapstream, from our CHI twenty twenty paper, gives viewers a frozen frame they can mark up and send back as a conversational anchor. It restores a literal shared image between streamer and viewers, which works beautifully for smaller, art-focused streams.

---

## Slide 21

With Snapstream, the shared reference was literal: one image everyone could inspect. At massive scale, literal pixels collapse into noise. The VisPoll work argues the common ground should shift from the bitmap to the structure of the input.
On the second fragment: the research question becomes how to support visual input from viewers that stays flexible for streamers yet scales to large audiences.

---

## Slide 22: Visual attributes as common ground

To solve this, we introduced a framework, VisPoll, which we presented at CHI twenty twenty-one as “Beyond Show of Hands.” The idea is to force crowd input through a shared vocabulary of visual attributes instead of raw pixels.
Reveal attributes one by one: position, shape, rotation, size, color. Position is where the mark sits; shape is the primitive viewers draw with; rotation and size often encode direction and magnitude; color can encode categories or votes.
When everyone uses the same attribute dimensions, the system can aggregate thousands of strokes into clusters the streamer can read. The attributes themselves become the common ground between crowd and machine.

---

## Slide 23: Specify viewer visual inputs

Concrete example from the CHI twenty twenty-one paper: a physics streamer asks how friction applies to a box on a ramp. Step one is specify: the streamer locks the vocabulary of marks.
On clicks: leave position free so viewers can point anywhere on the scene; lock shape to arrows so everyone draws the same primitive; leave rotation free for direction of force; leave size free for magnitude.
Constraining shape while leaving other axes free is how you keep answers comparable without crushing expression. The next slide shows aggregate and visualize on the same scenario.

---

## Slide 24

Step two after specify: aggregate. Because every submission uses the same attribute space, we can cluster by meaningful dimensions, here rotation and size. Step three: visualize a small number of thick arrows where width reflects support. The streamer sees consensus modes, not ten thousand raw strokes.

---

## Slide 25: Application scenarios

Examples from Beyond Show of Hands: quick coloring tasks, fill-in-the-blank sketches, and other prompts where the streamer needs a readable crowd signal, not a wall of unrelated doodles. Call out one panel and ask what pedagogical move it supports.

---

## Slide 26: Application scenarios

Second plate: science explanations such as electrolysis and history prompts where spatial marks carry meaning. Emphasize that the same attribute machinery supports very different domains because the streamer designs the affordance, not the pixels.

---

## Slide 27: Creative work is iterative. Build tools that make the iteration intuitive and fun.

Third pillar: creative work is looping, not shipping in one shot. The VideOrigami line of work, including our CHI twenty twenty-five paper on compositional structures as substrates for human-AI co-creation, asks how interfaces can keep people oriented and in control while models propose edits. I will connect that to intermediate artifacts and to why “one-shot agent” fantasies miss the point.

---

## Slide 28: The promise of agentic video editing?

Point to the Google News screenshot: the phrase is everywhere in industry press. Then play Runway’s Agent promo on the right if helpful. Advance to Murch’s thought experiment on the next slide.

---

## Slide 29: Murch black-box provocation

Murch’s provocation: a perfect brain-to-film black box would skip the very collaboration and discovery many directors want to keep. Use it as a rhetorical bridge to why we still need rich substrates for iteration, not only faster generation.

---

## Slide 30: Creative process is as important as the creative output, or perhaps even more.

Two reinforcements from outside HCI vendor demos. Murch argues many filmmakers care about the collaborative emergence of a film, not only the finished file. Hertzmann’s ICCC piece makes the same point computationally: experts trade in fuzzy goals plus exploratory search. Together they justify why “support iteration” belongs alongside semantics and common ground.

---

## Slide 31: Creative process is iterative

Use this beat to humanize iteration. Lasseter is describing Pixar story development as continual revision, not a single locked script. The same point generalizes beyond film to any creative practice where the value is in the journey, not instant export.

---

## Slide 32

Bridge line: our answer in the VideOrigami project is to foreground intermediate artifacts with explicit compositional structure, then wire AI through those structures rather than only through a chat box. The next slide summarizes what nine expert video creators told us in a formative study about real workflows and artifacts.

---

## Slide 33: Intermediate artifacts

Each artifact is not just a container: it encodes a compositional structure that makes relations between pieces visible and editable. Canvas behaves like a set; the script editor is linear; the planner is a grid; the timeline is temporal synchronization. In the CHI twenty twenty-five paper and the extended write-up on arXiv two five zero three dot zero four one zero three, we argue those structures are substrates for human-AI co-creation when AI helps transform and sync content inside and across them. Invite the audience to flip cards on screen if you are presenting live.

---

## Slide 34: VideOrigami

Brief tour of VideOrigami, the system from that paper: four linked views instantiate the structures we just named. Emphasize that AI is distributed across views instead of siloed in one assistant pane.

---

## Slide 35

Demo beat: the creator starts a fortune-cookie short in VideOrigami. In the canvas she collects clips and references; the canvas is an unstructured set for gathering. Mention that the agent can summarize assets here so themes surface early. Pause if the clip is long.

---

## Slide 36

Next, she moves into the narrative editor — a linear document where she can collaborate with the AI on the script. As they draft and refine talking points together, the agent does something interesting: it tracks provenance, linking each part of the emerging narrative back to the source assets it draws from. So the creator always knows which clip or reference supports a given talking point.

---

## Slide 37

Here's where things get really powerful. The narrative editor can be transformed into a grid — the scene planner. The agent suggests how to break the script into discrete scenes and pair each one with appropriate visuals. This is the grid compositional structure in action: a two-dimensional layout that lets the creator see the relationship between narrative segments and their visual treatments side by side.

---

## Slide 38

Now, when she moves on to work on the timeline, notice how each portion of the timeline corresponds directly to a cell in the scene plan. This is the key insight — the compositional structures aren't isolated views. They're connected substrates.

---

## Slide 39

As the creator selects a segment on the timeline, the corresponding cell in the scene plan is highlighted, and vice versa. This bidirectional linking means edits in one structure propagate meaningfully to the others — the system maintains coherence across levels of abstraction.

---

## Slide 40

And here you can see the full picture: every cell in the scene plan maps to a segment on the timeline. The creator can fluidly move between high-level story structure and low-level temporal editing, with AI assistance woven into each layer. This is what it means to infuse AI within and across compositional structures — not replacing the creator, but giving them powerful substrates for iteration at every stage of the process.

---

## Slide 41: Open Opportunities

Close the arc in one breath: semantics through the lyric-video pipeline and its guidelines; common ground through Snapstream and VisPoll; iteration through compositional structures in VideOrigami. The open questions point to backup slides if the room wants depth on branching, provenance, beneficial friction, or evaluation beyond task metrics.

---

## Slide 42: Thanks to…

These projects made the talk possible: UIST twenty three lyric automation with Jiaju Ma and colleagues; Snapstream at CHI twenty twenty with Saelyne Yang and collaborators; Beyond Show of Hands at CHI twenty twenty one with John Chung and colleagues; VideOrigami at CHI twenty twenty five with Yining Cao, Yiyi Huang, Anh Truong, Haijun Xia, and others on the paper. Offer to send PDF links after the session.

---

## Slide 43: Backup Slides

Optional depth on open challenges. Skip entirely in a short slot; use if the audience asks about branching, provenance, friction, or evaluation.

---

## Slide 44: Supporting Orientation Across Parallel Branches

When generation is cheap, the bottleneck becomes orientation: knowing which branch you are on and how variants differ. Karpathy’s quip about git is a hook for that shift. If asked for related HCI, point to VideoDiff and other diff tools for time-based media.

---

## Slide 45: VideoDiff: Comparing video versions is hard

VideoDiff at CHI twenty twenty five tackles comparison for multimodal timelines. Use it as a concrete neighbor problem to orientation: even if users can branch freely, they still need legible diffs and summaries, not only more thumbnails.

---

## Slide 46: Redefining "main" as creative intent, not a single implementation

Prototype from Adobe Research showing one intent authored into several aspect ratios. Backup for “track history”: when agents reinterpret layout, cropping, and pacing, which decisions belong in the changelog for a human reviewer?

---

## Slide 47: Intent-Driven Authoring: Open Questions

Spell out the research program: if canonical “main” is an intent graph rather than one rendered timeline, diff and review UIs have to change. Pair with the tracking box: expose implicit agent choices so audits resemble code review, not only scrubbing pixels.

---

## Slide 48: How do we enrich the creative process?

Reprise the Murch provocation for Q and A: instant perfect output is not obviously desirable if it deletes the reflective steps creators value. Sets up the next two slides on process and on beneficial friction in agentic tools.

---

## Slide 49: The case for creative process

Condensed version of the main-deck evidence cards: keep the citations if someone wants pointers after the talk.

---

## Slide 50: Beneficial Friction & Exposing Agent Decisions

Cite Zamfirescu-Pereira et al. CHI twenty twenty five as a program for studying exploration support, not only acceleration. Stress Q2: transparency about implicit agent decisions is a first-class HCI problem, especially when models chain multiple tools.

---

## Slide 51: What do we mean by "effective"?

Sutton’s “bitter lesson” line is a foil: reward alone is too narrow for subjective media. Argue for mixed methods: creative experience, longitudinal effects on practice, and costs outside the lab. Tie back to the takeaways slide if someone asks how we would know a system succeeded.

---
