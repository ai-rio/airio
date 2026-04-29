[**00:00**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=0s)

One single file decides whether the product you get is actually the right implementation you needed. For claude code users that is claude.md and others have their own files but most commonly they use the agents.mmd. But no matter which you are using unless you set it up properly you will keep fighting your agent on every task.

[**00:18**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=18s)

And if you think that running a simple init command is enough for you, you are actually wrong here. You need to follow a structured pattern tailored to the project that actually makes your agent perform better. So for that reason, we compiled the best practices you need to follow from other credible sources as well as from us spending hours with claude code so that you can plug them directly into your workflow.

[**00:38**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=38s)

And the last one is important because it determines how your agent actually follows your instructions. And if not followed, the rest instructions in your file won't be that impactful. The first thing that you need to add in your claw\.md file is something that's coming straight out of Andre Carpathy's skills repo, which contains the best claude.

[**00:54**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=54s)

md patterns he talks about. You need to add in an explicit instruction to Claude to think before coding. It makes Claude state assumptions explicitly. If multiple interpretations exist, it should present them all so that we can decide from the set of implementations. This pushes Claude to think from a different perspective before it actually dives into the solution.

[**01:13**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=73s)

This ensures that the solution it implements is aligned with what you wanted. This line cuts a huge amount of course correction out of our workflow, which is why we found it so helpful. With this instruction added, whenever you ask Claude to implement a feature, it will basically ask a set of questions related to the task you gave it so that your answers guide it on how to actually do the task.

[**01:32**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=92s)

This part in particular will be helpful because now Claude will not guess the implementations and dive straight in from the pattern it has memorized from the training data. It will think thoroughly about what the right implementation is and confirm with you if that's the intended implementation and then actually work on the feature instead of just wildly guessing it and you interrupting Claude because it did not follow the correct implementations that you had in mind which occurs so much more often and requires you to course correct a lot. The next rule is

[**01:58**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=118s)

choosing simplicity first. It's something so simple yet it still needs to be specifically stated in claude.md so that the agent gets properly reminded of this principle. Claude or any other agent tends to write large solutions for problems that can be solved with simple ones.

[**02:14**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=134s)

But this isn't only problematic because it causes delays. It also makes it hard to refactor the code later on and even harder to add features because the implementation is so verbose that it consumes a lot of tokens to implement simple things. So this line literally pushes Claude to iterate towards simplicity. We also add this on every project and especially when working on large scale applications because at that scale doing this becomes more important.

[**02:35**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=155s)

This specifically tells Claude not to add any features beyond what is asked and to ensure proper error handling for the implementation. The discipline framework around it is basically a hard threshold. If the solution to any problem you ask can be handled in 200 lines and could be refactored to 50, then Claude needs to rewrite the solution because its approach is wrong.

[**02:54**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=174s)

This will actually prevent Claude from writing a lot of useless overhead code with things that aren't even implementable and reflect the wrong sense of direction Claude selected. The third part of claude.mmd is implementing surgical changes or in simple words touching only those parts that the agent absolutely must touch.

[**03:12**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=192s)

This addresses something we face a lot when claude is writing a large amount of code at once and the fix needs to be explicitly stated in the claude.mmd file. Claude or agents in general when asked to do one task tend to try to improve the things around that task too. These improvements might look like adjacent code changes or formatting the code base which we don't actually want it to focus on at the moment.

[**03:33**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=213s)

This is annoying because Claude's attention gets divided across the multiple things it's trying to implement at once. Adding these kinds of changes is not good because Claude is basically including things we didn't want it to do right now. So, we need to state in claude.md the instructions explicitly to not do that. If the agent notices any unrelated dead code, it should mention it instead of fixing it itself.

[**03:54**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=234s)

At times, these kinds of things are there for specific reasons that are to be addressed later, not at the stage the app is currently in. The mental framework that lets Claude decide how to act properly is to check every change and see if it actually traces back to what the user asked. If it does, then it should make that change.

[**04:09**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=249s)

If it does not, it should not touch that feature. If this line is added, then whenever Claude has any issue in implementation, it will basically change only the thing the user asked it to fix. Therefore, it will tell you all the other issues it found in the same file and you can decide from there if you actually wanted to fix those or not.

[**04:26**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=266s)

The last pattern that was extracted from Andre Karpathi is goal-driven execution. Agents do not know what the correct output looks like, which is the core problem. They would work much more effectively if they did, and that's what this rule fixes. In the claw\.md file, we need to explicitly state Claude to define the success criteria for each task we give it.

[**04:44**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=284s)

Therefore, for any task we hand over, Claude needs to convert it into a verifiable goal. For example, if you give it a task to add validation, it will write tests for the invalid inputs and ensure those test cases actually pass with the right return values for the right inputs. So the whole idea is to have the agent implement test cases and then iterate until all the test cases pass.

[**05:04**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=304s)

And at the end, the project has the same behavior we actually need from it. If you give it any prompt on a task, it will set the verifiable goal and plan out the implementation. Then it will verify the work for you by adding all the test cases and showing how it will handle the whole app. In essence, now this might work for logical reasoning, but if you want the agent to verify how your UI looks, the agent cannot write test cases for that.

[**05:24**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=324s)

So for that, you can add in the claude chrome extension or puppeteer MCP so that it can verify how the UI looks using those tools. This helps because UI changes are hard to judge by looking at the code itself and giving the agent a verifiable way to let it see the current app's visuals and then using that it can fix the issues.

[**05:42**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=342s)

Therefore, you can explicitly add a line so it knows that after the UI implementation, it also needs to verify the result through the MCP. If you have created a claude.md file using claude code's own init command, you would see that it adds commands for running the dev server and the build server. But those are already in its training data and Claude already knows those commands and we don't need to explicitly waste lines in claude.

[**06:04**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=364s)

md telling it what it already knows. So in your file, you only need to mention the tools you want Claude to use instead of the ones it defaults to. There are certain CLI tools that make the workflow faster, but are not in Claude's default training data or the patterns it already relies on.

[**06:20**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=380s)

Therefore, you have to add those explicitly so that Claude knows those tools are installed and doesn't fall back to whatever it uses on its own all the time. For example, if you have installed the GitHub CLI, instead of using Git for working, you can add an instruction in claude.md to use its CLI instead of the default git commands for all the operations.

[**06:39**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=399s)

Similarly, you can add in more commands which are not the default ones. You also need to add in the running instructions for the project in this file if they are different from the usual ones. For example, most projects in the default setup are run by npm. And if your project runs with PNPM, you need to add this information so the agent knows what commands are actually meant to be run.

[**06:58**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=418s)

Anything else beyond commands that Claude already knows should not be included in the claude.md file. The next mention in claude.md is inspired by the creator of claude code and the workflow he revealed. He talked about how claude.md is not a write once and use forever file. It is something that constantly needs to be changed, updated and improved over the course of building as an ongoing process that needs to be iterated on again and again.

[**07:21**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=441s)

So you need to add an instruction that if Claude had to be told by the user that its implementation was not correct, it should first apply corrections as pointed out by the user. Once Claude has applied those corrections, it should also add those learnings to a dedicated file so that Claude can gradually build a knowledge base of what it should not do and what the correct way of doing things is, which it can reference later on as required.

[**07:43**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=463s)

But before we move forwards, let's have a word by our sponsor, Klouse. You've probably heard about AI agents. Maybe you've tried setting one up yourself. 15 minutes in, you're staring at a terminal, pasting API keys into config files, wondering if you just leaked something important. Clouse skips all of that. Claus runs OpenClaw, the open- source AI agent on the cloud.

[**08:03**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=483s)

You sign up, you get $15 in open router credits, and you start prompting. No terminal, no Docker, no API key scavenger hunt. I tested it by asking Claus to scrape a startup directory, organize the results into a table, and email it to me. One prompt in the chat window, done. No code, no browser extensions. It comes with built-in tools like Exa and Apollo, and connects to Slack, WhatsApp, even iMessage.

[**08:24**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=504s)

Everything runs on a firewalled machine completely isolated from your personal accounts. If something breaks, their autofix agent Clawbert patches it without you touching anything. Click the link in the pinned comment and try Claus for free. Since most coding projects are managed by Git, you need to explicitly add an instruction in claude.

[**08:41**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=521s)

md that Claude should not run commands that are irreversible without confirmation. And if there is a need to run such a command, the agent must ask for permission first. These commands are dangerous because once they are executed, the consequences are irreversible and they can cause damage to production. Things like force pushing, resetting the head, merging branches, or running remove with force commands.

[**09:02**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=542s)

You also need to add in an instruction that if Claude is unsure whether a command is destructive or not, it should ask instead of assuming. This will save you a lot of trouble. For example, if Claude accidentally tries to merge a branch that you do not want it to merge, it will ask for permission before doing so.

[**09:16**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=556s)

And you can then deny it so that your work stays safe. There is no need to put all aspects of information into a single claw\.md file because that will just bloat it unnecessarily and distract the agent from what it actually needs to do. So you need to create path scoped rule files that declare their scope on the first line and contain instructions tailored toward those exact files.

[**09:35**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=575s)

You also need to mention the location of these files in claude.md so Claude knows they exist. For example, if you want Claude to follow certain specific instructions when writing APIs, you can add those in a rule file for them so that when Claude is working on them, it can load those instructions and use them directly.

[**09:52**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=592s)

But just as importantly, this also ensures that API related instructions do not interfere when Claude is not working on them. You can have multiple rule files for different parts of the project, each containing instructions tailored to that specific area. This way, Claude only loads the relevant instructions when it is working on that part.

[**10:08**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=608s)

Therefore, it prevents context bloat and keeps the agent focused on its current task instead of being distracted by unrelated rules. Most large-scale applications are in a monor repo, which is a single large repository where all the different components are kept together with each folder acting as a separate part of its own and each part being managed independently while contributing to a different aspect of the main application.

[**10:30**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=630s)

So if you are running a project from a monor repo, you need to make sure that each subreo contains its own claw\.md file so that it actually contains instructions specific to it and does not have to rely only on the instructions from the global claw\.md. The global file should only consist of instructions that are broadly applicable to all parts of the system.

[**10:48**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=648s)

But scoped claw\.md files work better because they can contain instructions that are specific to that particular app or module. This allows the agent to perform better because it will have more focused guidance. Therefore, placing all large project instructions in the main file is the wrong move.

[**11:03**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=663s)

It will actually bloat the file with information. And when Claude passes through areas with instructions that don't concern the current task, it can cause its attention to diverge from what it actually needs to do. Also, if you are enjoying our content, consider pressing the hype button because it helps us create more content like this and reach out to more people.

[**11:21**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=681s)

You also need to add the project description in your claw\.md file and ensure that this instruction is placed at the very start of it, not buried down inside the rest of the instructions. This helps because the agent gets the gist of what the whole app is about by reading it first. So, it understands the context of how the app is structured, what it does in general, what the different services and dependencies are, and how the app runs.

[**11:42**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=702s)

This way, it knows from the start instead of looking at the code to deduce what the app does. Another section that we need to add in your claude.md file is that claude needs to verify not only that the feature exists but also that it functions correctly as intended before reporting any task as complete. It should use all available verification mechanisms to confirm that the build and tests pass properly.

[**12:04**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=724s)

But the point of this section is making sure the task is actually complete by using real verification steps, not just by checking that the code for the feature exists. Therefore, this instruction pushes Claude to report more faithfully and to use multiple types of checks like unit tests, linting, and type checks to make sure that the app is implemented correctly and works as intended.

[**12:24**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=744s)

Last but not least, the way you order your instructions in the claude.md file is also very important for ensuring high agent performance. You have to order them by priority. The first instructions should be hard rules, meaning always non-negotiable with no exceptions whatsoever. These hard rules should always come first before any other rules.

[**12:42**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=762s)

Then comes the medium priority rules which are not as strict as the previous ones. They are somewhat negotiable but still important and should not be violated. After that come the low priority instructions which mainly include references and conveniences so that the agent does not need to go back and use this section as a core decision source.

[**12:58**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=778s)

One more important thing is that you need to make sure the claude.md file is kept short. A best practice is to keep it under a strict limit of 300 lines which is considered optimal for agent performance. But once it gets longer than that, performance starts to degrade. The claw\.md file talked about here and all other resources mentioned here are available in AIABS Pro for this video and for all our previous videos from where you can download and use it for your own projects.

[**13:23**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=803s)

If you found value in what we do and want to support the channel, this is the best way to do it. The links in the description. That brings us to the end of this video. If you'd like to support the channel and help us keep making videos like this, you can do so by using the super thanks button below.

[**13:37**](https://youtube.com/watch?v=fMY5Sdj2DMk\&t=817s)

As always, thank you for watching and I'll see you in the next one.
