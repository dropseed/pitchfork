# pitchfork

Client-side search index and UI for static sites

## HTML

```html
<input data-pitchfork-input type="text" placeholder="Search">
<div data-pitchfork-results
    data-pitchfork-index-url="/search-index.json"
    data-pitchfork-truncate="140"
    data-pitchfork-highlight-class="bg-yellow-200"
    data-pitchfork-active-class="bg-gray-100"
    style="display: none;">
    {{#results}}
    <a href="{{url}}" class="block py-2 px-4 border-b border-gray-200 hover:bg-gray-100">
        <div class="font-medium">
            {{{highlights.title}}}
        </div>
        {{#headings}}<div class="text-sm text-gray-600">{{text}}</div>{{/headings}}
        <div class="text-sm text-gray-700">
            {{{highlights.text}}}
        </div>
    </a>
    {{/results}}

    {{^results}}
    <p>No matches, keep typing...</p>
    {{/results}}
</div>
```

## Creating an index

To create an index without installing pitchfork to your project:

```sh
$ npx -p @dropseed/pitchfork pitchfork index output -c .content
```
