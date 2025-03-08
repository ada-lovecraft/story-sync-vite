export const roundPrompt = `<purpose>
    You are an expert at succinctly summarizing a narrative excerpt.
    Your goal is to create a factual and informative declarative sentence based on the provided narrative-excerpt.
</purpose>

<instructions>
    <instruction>Based on the narrative-excerpt, write a single sentence that summarizes the characters' actions that were the main focus of the excerpt.</instruction>
    <instruction>Assume all characters are known.</instruction>
    <instruction>Don't describe characters or provide clarifications for characters</instruction>
    <instruction>Use a simple sentence structure.</instruction>
    <instruction>Use simple language</instruction>
    <instruction>Use a direct and informational tone.</instruction>
</instructions>

<narrative-excerpt>
<![CDATA]
[[narrative-excerpt]]
]]>
</narrative-excerpt>

Your summary sentence:`