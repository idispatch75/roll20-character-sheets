/* eslint-disable camelcase */
/* eslint-disable no-undef */
const berserkIlluminationRoll = ['berserkIlluminationBlaze', 'berserkIlluminationLantern'];

berserkIlluminationRoll.forEach((button) => {
  on(`clicked:${button}`, (info) => {
    const roll = info.htmlAttributes.value;

    const attributs = [];

    if (button === 'berserkIlluminationBlaze') {
      attributs.push(`${button}Dgts`);
      attributs.push(`${button}Violence`);
      attributs.push(`${button}Portee`);
    }

    if (button === 'berserkIlluminationLantern') {
      attributs.push(`${button}Dgts`);
      attributs.push(`${button}Portee`);
    }

    getAttrs(attributs, (value) => {
      const exec = [];
      exec.push(roll);

      const dgts = value[`${button}Dgts`];
      let violence = 0;
      const portee = value[`${button}Portee`];

      if (button === 'berserkIlluminationBlaze') {
        violence = value[`${button}Violence`];
        exec.push(`{{violence=[[${violence}]]}}`);
      }

      if (button === 'berserkIlluminationLantern') {
        exec.push(`{{esperance=${i18n_esperance}}}`);
        exec.push(`{{esperanceConditionD=${i18n_esperanceConditionD}}}`);
        exec.push('{{degatsConditionnel=true}}');
      }

      exec.push(`{{degats=[[${dgts}]]}}`);
      exec.push(`{{portee=${i18n_portee} ${portee}}}`);

      startRoll(exec.join(' '), (results) => {
        const tDegats = results.results.degats.result;
        let tViolence = 0;

        if (results.results.violence !== undefined) { tViolence = results.results.violence.result; }

        finishRoll(
          results.rollId,
          {
            degats: tDegats,
            violence: tViolence,
          },
        );
      });
    });
  });
});

const berserkIlluminationRollSimple = ['berserkIlluminationCandle', 'berserkRageSacrificeEspoir', 'berserkRageN3Dgts',
  'berserkRageHostileHumain', 'berserkRageSalopardHumain', 'berserkRagePatronHumain', 'berserkRageBandeHumain',
  'berserkRageHostileAnathème', 'berserkRageSalopardAnathème', 'berserkRagePatronAnathème', 'berserkRageBandeAnathème'];

berserkIlluminationRollSimple.forEach((button) => {
  on(`clicked:${button}`, (info) => {
    const roll = info.htmlAttributes.value;

    const exec = [];
    exec.push(roll);

    startRoll(exec.join(' '), (results) => {
      finishRoll(
        results.rollId,
        {},
      );
    });
  });
});
