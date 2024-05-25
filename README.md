# browser-question

This tool answers a question provided to it by using the Chrome browser to search Google.

## Example

```bash
gptscript github.com/gptscript-ai/browser-question '{"question":"Who was Oliver Cromwell?"}'
```

## How it Works

```mermaid
flowchart TD
    A(Begin execution) --> B(Parse input)
    B --> C(Generate Google query with gpt-3.5-turbo)
    B --> D(Set up browser contexts)
    C --> E(Search Google and get page contents immediately as links are found)
    D --> E
    E --> F(Give all contents to gpt-4o to determine the answer)
```
