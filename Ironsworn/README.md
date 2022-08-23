# Ironsworn - Character Sheet
## Building Sheet
This sheet uses [pugjs](https://www.google.com) for HTML templating, along with [Stylus](https://www.google.com) from CSS templating.
To build finished sheet run the following commands from command line or terminal:
```bash
cd src
npm install

// Mac or Linux
npm run build:pug 
// Windows
npm run build:pug:win

npm run build:css
```
These will then generate a `dist` folder that will have the finished code. From there you can upload them into the custom sheet sandbox for testing.

## Pushing Changes
Roll20 does not build our pug/stylus code for when we merge. This needs to be done locally by running `npm run gulp:build` in the Ironsworn/src directory.

## Translations
To keep our translation and fallback html content consistent. We are loading the translations into pug under the `locals` global variable. This allows us to call `locals.translations[<translation-key>]` to get our content. This way we can propagate changes and avoid hardcoding content.

## Changelog
You can handle a new version in:
- `src/package.json`: edit the `version` property
- `src/app/workers/scripts/pages.js`: change the value of `changelog_X.Y.Z` to match
- `src/app/pages/index.pug`: change the value of `attr_changelog_X.Y.Z` to match and add a new changelog entry

## Tools
- [Visual Studio Code](https://code.visualstudio.com/download)
  - [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
  - [stylus](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus)

## Local testing
A minimal framework for testing locally is present in `src/test`.
It allows to generate an html page that almost renders and behaves as on the Sheet sandbox.
It is not meant to replace a validation on the Sheet sandbox but it may be useful for rapid testing or for those without access to the sandbox.

### Test the character sheet
You must create a file `test/attributes.js` that contains the initial values of your attributes.
It may be an empty object if you do not want to initialize any value.
For instance:
``` js
const initAttributes = {
  close_changelog: 'on',
  modes_choice: 'off',
  mode: '0',
  edge: '1',
  heart: '2',
  iron: '3',
  shadow: '4',
  wits: '5',
  health: '5',
  spirit: '5',
  supply: '5',
  momentum_max: 10,
  momentum_reset: 2
}; // don't forget the semi-colon
```
You can also create repeating section items by initializing at least one of their attributes.
You must specify the row ID, which must start with `rowid`, e.g. `repeating_progress_rowid0012_name`.

To build for testing, use `npm run gulp:test-watch`.
This compiles `test/Ironsworn.html` and `Ironsworn.css`.
You can open `test/Ironsworn.html` in your browser.
Beware that `gulp:test-watch` does not react to changes to `translation.json` (if you add it to the tracked files, recompilation triggers but changes are not taken into account. Probably related to how the pug plugin works).

### Test the roll templates
You must create a file `test/roll-template-specs.js` that contains the list of template variations you want to display at the same time (to test different input values at the same time).
It contains a list of specs containing the template ID, whether to display the template (so that you can easily toggle the display), and the values that are the inputs of the template.
For instance:
```js
var rollSpecs = [
  {
    "templateId": "ironsworn_moves",
    "display": true,
    "values": {
      "header": "@character_name",
      "name": "roll +spirit",
      "action": "[[5]]",
      "negate1": "[[6]]",
      "negate2": "[[7]]",
      "negate3": "[[8]]",
      "negate4": "[[9]]",
      "negate5": "[[10]]",
      "negate6": "[[11]]",
      "challenge1": "[[4]]",
      "challenge2": "[[5]]",
      "momentum": "[[9]]",
      "modifiers": "[[5]]",
      "add": "[[0]]"
    }
  }
]; // don't forget the semi-colon
```
The roll values must be enclosed in brackets (`[[5]]`): the system checks that you use the inline roll values properly in the template and throws an exception otherwise.  
To build this list you should click on a roll button in the character sheet and copy/paste the resulting popup value (which is also output on the console), and replace the roll specs with the numeric values you want to test.
If an attribute value `@{myattribute}` appears as `@myattribute`, it means this attribute was not set by interacting with the sheet and may imply it does not exist all in the sheet (i.e. you made a mistake typing its name in the roll button).
Otherwise the attribute's value is used.  
The roll macro with replaced attributes is also output to the console and copied to the clipboard: you can test it in the site's chat.

To build for testing, use `npm run gulp:test-rt-watch`.
This compiles `test/test-roll-templates.html` and `Ironsworn.css`.
You can open `test/test-roll-templates.html` in your browser and resize it to check with different widths.

There is a `test/test-roll-templates-specs` directory that contains specs for the current templates.
You can copy/paste them to `roll-template-specs.js` if you make changes to one of the roll template.

### Limitations
- Rolls are not interpreted, you can check your macros on the site in the chat
- No i18n

## Compatibility
The sheet has been tested across multiple browsers and devices, show below in the compatibility matrix:
|Browser|Windows|MacOs|Android|iOS|
|---|---|---|---|---|
|Chrome|yes|yes|yes|yes|
|Firefox|yes|yes|yes|yes|
|Safari|no|yes|no|yes|

## Roll Logic
### Wield a Rarity
Structured it using pseudo code for readability.
```javascript
if rarityDie6 == rarityAction
  if challenge1 == challenge2
    opportunity()
  else
    strongHit()
  if rarityDie6 == rarityAction
    rarityDramatic()
else
  if rarityAction > 10
    if challenge1 == 10
      if challenge2 == 10
        complication()
        if rarityDie1 == rarityAction
          rarityFail()
      else
        weakHit()
        if rarityDie5 == rarityAction
          raritySubtle()
    else
      if challenge2 == 10
        weakHit
        if rarityDie5 == rarityAction
          raritySubtle()
      else
        strongHit
        if rarityDie5 == rarityAction
          raritySubtle()
  else
    if rarityAction > challenge1
      if challenge1 == challenge2
        opportunity()
        if rarityDie5 == rarityAction
          raritySubtle()
      else
        if rarityAction > challenge2
          strongHit()
          if rarityDie5 == rarityAction
            raritySubtle()   
        else
          weakHit()
          if rarityDie5 == rarityAction
            raritySubtle()
    else
      if challenge1 == challenge2
        complication()
        if rarityDie1 == rarityAction
          rarityFail()
      else
        if rarityAction > challenge2
          weakHit()
          if rarityDie5 == rarityAction
            raritySubtle()
        else
          miss()
          if rarityDie1 == rarityAction
            rarityFail()
```
Roll with momentum
```js
if rarityDie6 == rarityAction
  if challenge1 == challenge2
    opportunity()
  else
    strongHit()
  if rarityDie6 == rarityAction
    rarityDramatic()
else
  if rarityAction > 10
    if challenge1 == 10
      if challenge2 == 10
        complication()
        if rarityDie1 == rarityAction
          rarityFail()
      else
        weakHit()
        if rarityDie5 == rarityAction
          raritySubtle()
    else
      if challenge2 == 10
        weakHit
        if rarityDie5 == rarityAction
          raritySubtle()
      else
        strongHit
        if rarityDie5 == rarityAction
          raritySubtle()
  else
    if rarityAction > challenge1
      if challenge1 == challenge2
        opportunity()
        if rarityDie5 == rarityAction
          raritySubtle()
      else
        if rarityAction > challenge2
          strongHit()
          if rarityDie5 == rarityAction
            raritySubtle()
        else
          weakHit()
          if rarityDie5 == rarityAction
            raritySubtle()
          if momentum > challenge2
            momentumStrongHit()
    else
      if challenge1 == challenge2
        complication()
        if rarityDie1 == rarityAction
          rarityFail()
        if momentum > challenge1
          momentumStrongHit()
          if rarityDie5 == rarityAction
            raritySubtle()
      else
        if rarityAction > challenge2
          weakHit()
          if rarityDie5 == rarityAction
            raritySubtle()
          if momentum > challenge1
            momentumStrongHit()
        else
          miss()
          if rarityDie1 == rarityAction
            rarityFail()
          if momentum > challenge1
            if momentum > challenge2
              momentumStrongHit()
              if rarityDie5 == rarityAction
                raritySubtle()
            else
              momentumWeakHit()
              if rarityDie5 == rarityAction
                raritySubtle()
          else
            if momentum > challenge2
              momentumWeakHit()
              if rarityDie5 == rarityAction
                raritySubtle()
```
