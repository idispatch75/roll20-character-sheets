const ATTR_PREFIX = 'attr_';
const REPEATING_PREFIX = 'repeating_';
const ROWID_PREFIX = 'rowid';

// events handling
const eventHandlers = {}; // stores the handlers for each sheet event: event_name => [handler]

window.on = function (eventNames, fn) {
  eventNames.split(' ').forEach(eventName => {
    eventName = eventName.toLowerCase();

    let handlers;
    if (!eventHandlers.hasOwnProperty(eventName)) {
      handlers = [];
      eventHandlers[eventName] = handlers;
    } else {
      handlers = eventHandlers[eventName];
    }

    console.log('Registering handler for event ' + eventName);

    handlers.push(fn);
  });
};

const attributeStore = { // stores the attribute values, backend for getAttrs/setAttrs
  setValue: function (attributeName, value) {
    attributeName = attributeName.toLowerCase();
    this[attributeName] = value;
  },

  getValue: function (attributeName) {
    attributeName = attributeName.toLowerCase();
    if (this.hasOwnProperty(attributeName)) {
      return this[attributeName];
    } else {
      return undefined;
    }
  }
};

$(document).ready(function () {
  // instrument inputs
  instrumentInputs($('body'));

  // instrument fieldsets
  $('fieldset').each(function () {
    const fieldset = $(this);
    fieldset.attr('style', 'display:none');

    const sectionId = fieldset.attr('class').split(' ').find(_ => _.startsWith(REPEATING_PREFIX));

    // setup container and controls
    const repContainer = $(`<div class="repcontainer ui-sortable" data-groupname="${sectionId}">`);
    fieldset.after(repContainer);
    const repControl = $(`<div class="repcontrol" data-groupname="${sectionId}">`);
    const editButton = $('<button class="btn repcontrol_edit">Modify</button>');
    repControl.append(editButton);
    const addButton = $('<button class="btn repcontrol_add" style="display: inline-block;">+Add</button>');
    repControl.append(addButton)
    repContainer.after(repControl);

    editButton.click(e => {
      const button = $(e.target);
      const sectionId = getButtonSectionId(button);

      const repControl = button.parent();
      const repContainer = repControl.siblings(`[data-groupname="${sectionId}"]`);
      const isEditMode = repContainer.hasClass('editmode');

      if (isEditMode) {
        button.siblings('.repcontrol_add').show();
        button.text('Modify');
        repContainer.removeClass('editmode');
      } else {
        button.siblings('.repcontrol_add').hide();
        button.text('Done');
        repContainer.addClass('editmode');
      }
    });

    addButton.click(e => {
      const button = $(e.target);
      const sectionId = getButtonSectionId(button);

      // add a new rep item with the content of the fieldset
      const rowId = generateRowID();
      const repItem = $(`<div class="repitem" data-reprowid="${rowId}">`);
      const itemControl = $('<div class="itemcontrol">');
      const deleteButton = $('<button class="btn btn-danger pictos repcontrol_del">#</button>');
      itemControl.append(deleteButton);
      repItem.append(itemControl);

      const fieldset = $('fieldset.' + sectionId);
      repItem.append(fieldset.html());
      const repContainer = button.parent().siblings(`[data-groupname="${sectionId}"]`);
      repContainer.append(repItem);

      // make attribute names unique for radio button to allow proper radio behavior
      repItem.find(`input[name^="${ATTR_PREFIX}"][type="radio"]`).each(function () {
        const input = $(this);
        const attributeName = getInputAttributeName(input);
        input.attr('name', `${ATTR_PREFIX}${rowId}_${sectionId}_${attributeName}`);
        input.attr('data-attrname', attributeName);
      });

      // instrument the inputs for the new item
      instrumentInputs(repItem);

      deleteButton.click(e => {
        const button = $(e.target);
        button.parents('.repitem').remove();
      });
    });

    function getButtonSectionId(button) {
      return button.parent().attr('data-groupname');
    }
  });
});

function instrumentInputs(root) {
  const inputSelector = `input[name^='${ATTR_PREFIX}'], select[name^='${ATTR_PREFIX}']`;

  // handle changes for input and select
  $(inputSelector, root).each(function () {
    const input = $(this);

    input.change(event => {
      // get the value
      let value;
      if (input.attr('type') === 'checkbox') {
        value = event.target.checked ? 'on' : 'off';
      } else {
        value = event.target.value;
      }

      // store the value
      let attributeName = input.attr('data-attrname') ?? getInputAttributeName(input);

      const repItem = input.parents('.repitem');
      if (repItem.length > 0) {
        currentRepeatingContext = {
          sectionId: repItem.parent().attr('data-groupname'),
          rowId: repItem.attr('data-reprowid')
        }

        attributeName = `${currentRepeatingContext.sectionId}_${currentRepeatingContext.rowId}_${attributeName}`;

      } else {
        currentRepeatingContext = undefined;
      }

      console.log(`New value for attribute ${attributeName}: ${value}`);

      setAttrs({ [`${attributeName}`]: value });
    });
  });

  // init the attributes values in the store
  $(inputSelector, root).each(function () {
    const input = $(this);

    let attributeName = input.attr('data-attrname') ?? getInputAttributeName(input);

    const repItem = input.parents('.repitem');
    if (repItem.length > 0) {
      const sectionId = repItem.parent().attr('data-groupname');
      const rowId = repItem.attr('data-reprowid');
      attributeName = `${sectionId}_${rowId}_${attributeName}`;
    }
    attributeName = attributeName.toLowerCase();

    if (input.attr('type') == 'radio' || input.attr('type') == 'checkbox') {
      if (input.prop('checked')) {
        attributeStore.setValue(attributeName, input.val());
      }
    } else {
      if (input.val() != '') {
        attributeStore.setValue(attributeName, input.val());
      }
    }
  });

  // handle rolls
  $("button[type='roll']", root).each(function () {
    const button = $(this);
    button.click(() => {
      const firstSpaceIndex = button.val().indexOf(' ');
      let templateDef = button.val().substring(2, firstSpaceIndex - 1);
      const templateId = templateDef.split(':')[1];

      // replace attributes
      let rollSpec = button.val().substring(firstSpaceIndex);
      for (const group of rollSpec.matchAll(/@\{([\w-]+)\}/g)) {
        rollSpec = rollSpec.replace(group[0], attributeStore.getValue(group[1]) ?? '@' + group[1]);
      }

      // show result
      const templateSpec = {
        templateId,
        display: true,
        values: {}
      };
      (rollSpec + ' ').match(/\{\{(.+?)\}\}\s/g).map(_ => _.substring(2, _.length - 3)).forEach(_ => {
        const parts = _.split('=');
        templateSpec.values[parts[0]] = parts[1];
      });

      window.alert(JSON.stringify(templateSpec, undefined, 2));
      console.log(JSON.stringify(templateSpec, undefined, 2));
      console.log(`$\{${templateDef}\}${rollSpec}`);
    });
  });
}

// attributes handling
let currentRepeatingContext = undefined; // stores the repeating section info when an input change is triggered

window.getAttrs = (attributeNames, fn) => {
  const values = {};
  for (attributeName of attributeNames) {
    const attribute = buildAttribute(attributeName);
    values[attributeName] = attributeStore.getValue(attribute.fullName);
  }

  fn(values);
}

window.setAttrs = (attributeValues, isInit) => {
  const attributes = [];

  for (const attributeName in attributeValues) {
    // build attribute
    const attribute = buildAttribute(attributeName);
    attribute.currentValue = attributeStore.getValue(attribute.fullName);
    attribute.newValue = attributeValues[attributeName];

    attributes.push(attribute);

    // store the new value
    attributeStore.setValue(attribute.fullName, attribute.newValue);
  }

  console.log('Stored attributes: ' + JSON.stringify(attributeValues));

  // react to value changes
  for (const attribute of attributes) {
    // if the value changed
    if (attribute.currentValue !== attribute.newValue || isInit) {
      // set the value of the input matching the attribute, which may be in a section
      if (attribute.sectionId) {
        const repItem = $(`.repitem[data-reprowid="${attribute.rowId}"]`);
        setValue($(repItem));
      } else {
        setValue($('body'));
      }

      function setValue(inputParent) {
        // set input value
        const inputName = ATTR_PREFIX + attribute.name.toLowerCase();

        console.log(`Updating input ${inputName} with value ${attribute.newValue}`);

        let input = inputParent.find(`input[name='${inputName}'], select[name='${inputName}']`);
        input.val([attribute.newValue]);

        // set span text
        let span = inputParent.find(`span[name='${inputName}']`);
        span.text(attribute.newValue);
      }

      // invoke event handlers
      const eventInfo = {
        previousValue: attribute.currentValue,
        newValue: attribute.newValue,
        sourceAttribute: attribute.fullName
      }
      invokeEvent(`change:${attribute.name}`);
      invokeEvent(`change:${attribute.name}_max`);
      if (attribute.sectionId) {
        invokeEvent(`change:${attribute.sectionId}`);
        invokeEvent(`change:${attribute.sectionId}:${attribute.name}`);
      }

      function invokeEvent(eventName) {
        eventName = eventName.toLowerCase();

        if (eventHandlers.hasOwnProperty(eventName)) {
          console.log('Invoking handlers for event: ' + eventName);
          eventHandlers[eventName].forEach(function (handler) { handler(eventInfo) });
        }
      }
    }
  }
};

function buildAttribute(attributeName) {
  // supported names are:
  // <attribute_name>
  // repeating_<sectionId>_<attribute_name>
  // repeating_<sectionId>_<rowId>_<attribute_name>
  const attribute = {};
  const nameParts = attributeName.split('_');
  if (attributeName.startsWith(REPEATING_PREFIX)) {
    attribute.sectionId = nameParts[0] + '_' + nameParts[1];
    if (nameParts[2].startsWith(ROWID_PREFIX)) {
      attribute.rowId = nameParts[2];
      attribute.name = nameParts.slice(3).join('_');
    } else {
      if (currentRepeatingContext.sectionId != attribute.sectionId) {
        console.error('The row ID must be specified when the section ID is different from the call context');
      }
      attribute.rowId = currentRepeatingContext.rowId;
      attribute.name = nameParts.slice(2).join('_');
    }
    attribute.fullName = `${attribute.sectionId}_${attribute.rowId}_${attribute.name}`;

  } else {
    attribute.name = attributeName;
    attribute.fullName = attribute.name;
  }

  return attribute;
}

window.generateRowID = () => {
  let result = ROWID_PREFIX;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 12; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

// initialize attributes
$(document).ready(function () {
  setAttrs(initAttributes, true);
});

function getInputAttributeName(input) {
  return input.attr('name').substring(ATTR_PREFIX.length);
}
