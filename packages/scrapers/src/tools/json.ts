/**
 * Funkce opraví useknuté JSON pole odstraněním neúplného záznamu a uzavřením pole
 * @param {string} brokenJson - Řetězec obsahující useknuté JSON pole
 * @return {string} - Opravený JSON řetězec
 */
export function repairTruncatedJsonArray(brokenJson: string): string {
  try {
    // Zkusíme nejprve analyzovat původní JSON
    // JSON.parse(brokenJson);
    // Pokud se to podaří bez chyby, vrátíme původní řetězec
    return brokenJson;
  } catch (error) {
    // Ověříme, zda se jedná o JSON pole
    // console.log(brokenJson);
    if (!brokenJson.trim().startsWith('[')) {
      throw new Error('Vstupní řetězec není JSON pole');
    }

    // Najdeme všechny kompletní objekty v poli
    let objectsCount = 0;
    let bracketBalance = 0;
    let insideString = false;
    let escapeNext = false;
    let lastValidIndex = 0;

    for (let i = 0; i < brokenJson.length; i++) {
      const char = brokenJson[i];

      // Zpracování únikových znaků v řetězcích
      if (insideString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          insideString = false;
        }
        continue;
      }

      if (char === '"') {
        insideString = true;
      } else if (char === '{') {
        if (bracketBalance === 0) {
          // Začátek nového objektu
          objectsCount++;
        }
        bracketBalance++;
      } else if (char === '}') {
        bracketBalance--;
        if (bracketBalance === 0) {
          // Konec kompletního objektu, aktualizujeme poslední platný index
          lastValidIndex = i;
        }
      }
    }

    // Pokud nebyl nalezen žádný kompletní objekt, vrátíme prázdné pole
    if (objectsCount === 0 || lastValidIndex === 0) {
      return '[]';
    }

    // Ořežeme řetězec na posledním platném objektu a uzavřeme závorku pole
    const repairedJson = brokenJson.substring(0, lastValidIndex + 1) + '\n]';

    // Ověříme, zda je opravený JSON platný
    try {
      JSON.parse(repairedJson);
      return repairedJson;
    } catch (error) {
      // Pokud stále nelze zpracovat, zkusíme najít poslední platnou čárku a odstranit ji
      const lastCommaIndex = repairedJson.lastIndexOf(',');
      if (lastCommaIndex > 0 && lastCommaIndex > lastValidIndex) {
        const finalJson = repairedJson.substring(0, lastCommaIndex) + '\n]';
        JSON.parse(finalJson); // Ověříme, že lze rozebrat
        return finalJson;
      }

      throw new Error('Nelze opravit JSON');
    }
  }
}
