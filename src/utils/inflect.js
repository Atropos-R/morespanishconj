/*
 * inflect.ts - inflect a Spanish verb for the given parameters
 *
 * Copyright © 2017, HealthTap, Inc.
 * Copyright © 2025, Edwin Hoogerbeets
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import CSV from "./CSV.js";
import {
    endings_json,
    styljson as styles_es_json,
    regularVerbsIAR_tsv,
    verbsOUE_tsv,
    verbsIE_tsv,
    verbsEIE_tsv,
    exceptions_json,
} from "./conjugatorData.js";

const endings = JSON.parse(endings_json);
const styles = JSON.parse(styles_es_json);
const csv = new CSV({ columnSeparator: '\t' });
const exceptionRules = {};
csv.toJS(regularVerbsIAR_tsv).forEach((row) => { exceptionRules[row.infinitive] = row; });
const verbsOUE = csv.toJS(verbsOUE_tsv).map((info) => info.infinitive);
csv.toJS(verbsIE_tsv).forEach((row) => { exceptionRules[row.infinitive] = row; });
csv.toJS(verbsEIE_tsv).forEach((row) => { exceptionRules[row.infinitive] = row; });
const exceptions = JSON.parse(exceptions_json);
function reverse(str) {
    return str.split("").reverse().join("");
}
function replaceLast(str, oldChar, newChar) {
    for (let i = str.length - 1; i > -1; i--) {
        if (str[i] === oldChar) {
            return str.substring(0, i) + newChar + str.substring(i + 1);
        }
    }
    return str;
}
function fixStem(stem, ending, suffix, options) {
    const whole = stem + ending;
    const mood = options.mood || "indicative";
    const tense = options.tense || "present";
    const positivity = options.positivity || "affirmative";
    const useSubjunctive = (mood === "subjunctive") ||
        (mood === "imperative" &&
            (positivity === "negative" || options.person === "third" ||
                (options.person === "first" && options.number === "plural")));
    if (exceptionRules[whole]) {
        const type = exceptionRules[whole]["stem change"];
        if (useSubjunctive) {
            const subjStemAll = exceptionRules[whole].yo && exceptionRules[whole].yo !== "-ío";
            if (tense === "present" &&
                (options.person === "third" || options.number === "singular" || subjStemAll)) {
                if (exceptionRules[whole]["subj stem"]) {
                    stem = exceptionRules[whole]["subj stem"];
                }
                else if (exceptionRules[whole].yo) {
                    switch (exceptionRules[whole].yo) {
                        case "-go":
                            stem += "g";
                            break;
                        case "-ío":
                            stem = replaceLast(stem, "i", "í"); // only replace the last one
                            break;
                        case "-jo":
                            stem = replaceLast(stem, "e", "i"); // only replace the last one
                            stem = stem.substring(0, stem.length - 1) + "j";
                            break;
                    }
                }
            }
            else if (tense === "future" && exceptionRules[whole]["future"]) {
                stem = exceptionRules[whole]["future"];
            }
            else if (ending === "ir") {
                stem = replaceLast(stem, "e", "i"); // only replace the last one
            }
        }
        else if (tense === "future" && exceptionRules[whole]["future"]) {
            stem = exceptionRules[whole]["future"];
        }
        else if (exceptionRules[whole]["yo"] &&
            (mood === "indicative" && tense === "present") &&
            options.number === "singular" && options.person === "first") {
            switch (exceptionRules[whole].yo) {
                case "-go":
                    stem += "g";
                    break;
                case "-ío":
                    stem = replaceLast(stem, "i", "í"); // only replace the last one
                    break;
                case "-jo":
                    stem = replaceLast(stem, "e", "i"); // only replace the last one
                    stem = stem.substring(0, stem.length - 1) + "j";
                    break;
            }
        }
        else if (type && (mood === "imperative" ||
            (mood === "indicative" && tense === "present")) &&
            (options.person === "third" || options.number === "singular")) {
            switch (type) {
                case "e-ie":
                    stem = replaceLast(stem, "e", "ie"); // only replace the last one
                    break;
                case "e-i":
                    stem = stem.replace("e", "i"); // only replace the first one
                    break;
                case "i-í":
                    stem = replaceLast(stem, "i", "í"); // only replace the last one
                    break;
            }
        }
        else if (mood === "imperative" && ending === "ir" &&
            (options.person === "first" || positivity === "negative")) {
            stem = replaceLast(stem, "e", "i"); // only replace the last one
        }
        else if (tense === "preterite" && exceptionRules[whole]["preterite"]) {
            if (exceptionRules[whole]["preterite"] === "3rd e-i") {
                if (options.person === "third") {
                    stem = replaceLast(stem, "e", "i"); // only replace the last one
                }
            }
            else {
                stem = exceptionRules[whole]["preterite"];
            }
        }
    }
    if ((mood === "imperative" || tense === "present") && verbsOUE.indexOf(whole) > -1 &&
        (options.person === "third" || options.number === "singular")) {
        stem = stem.replace("o", "ue"); // only replace the first one
    }
    if (ending === "ar") {
        if (stem.slice(-1) === "c" && (suffix[0] === "e" || suffix[0] === "é")) {
            stem = stem.substring(0, stem.length - 1) + "qu";
        }
        else if (stem.slice(-1) === "g" && (suffix[0] === "e" || suffix[0] === "é")) {
            stem = stem.substring(0, stem.length - 1) + "gu";
        }
        else if (stem.slice(-1) === "z" && (suffix[0] === "e" || suffix[0] === 'é')) {
            stem = stem.substring(0, stem.length - 1) + "c";
        }
    }
    if (ending === "er") {
        const stemEnd = stem.slice(-2);
        if ((stemEnd === "oc" || stemEnd === "ec") && (suffix[0] === "a" || suffix[0] === 'á' || suffix[0] === 'o')) {
            stem = stem.substring(0, stem.length - 1) + "zc";
        }
    }
    else if (ending === "ir" && !exceptionRules[whole]) {
        if (suffix[0] === "a" || suffix[0] === 'á' || suffix[0] === 'o') {
            if (stem.slice(-2) === "uc") {
                stem = stem.substring(0, stem.length - 1) + "zc";
            }
            else if (stem.slice(-1) === "g") {
                stem = stem.substring(0, stem.length - 1) + "j";
            }
        }
    }
    if (stem[0] === "u") {
        stem = "h" + stem;
    }
    return stem;
}
/**
 * Inflect the given verb according to the given parameters.
 * The parameters are given as an object that contains
 * any of the following properties:
 *
 * - person: "first", "second", "third" (default: "first")
 * - number: "singular", "plural" (default: "singular")
 * - mood: "indicative", "subjunctive", "conditional", "imperative" (default: "indicative")
 * - tense: depends on mood (default: "present")
 * - gender: "masculine", "feminine", "inanimate" (default: "masculine")
 * - positivity: "affirmative", "negative" (default: "affirmative")
 * - formality: "formal", "informal"
 * - style: "castillano", "rioplatense", "chileano", etc. (default: "castillano")
 * - reflection: boolean
 * - verbOnly: boolean
 *
 * @param verb the infinitive form of the verb to inflect
 * @param options optional parameters as per above
 * @returns the inflected verb
 */
const inflect = function (verb, options) {
    if (!verb || verb.length < 2) {
        return "";
    }
    let ret;
    let original = "";
    // Normalize accented infinitive endings (oír → oir, reír → reir for lookup purposes)
    let normalizedVerb = verb;
    if (verb.endsWith("ír")) {
        normalizedVerb = verb.slice(0, -2) + "ir";
    }
    const ending = normalizedVerb.slice(-2);
    if (!(ending in endings)) {
        // not a verb -- can't inflect it!
        return verb;
    }
    let stem = normalizedVerb.substring(0, normalizedVerb.length - 2);
    const originalStem = stem;
    // see if we can use other exception verbs because prefixes hardly
    // ever change the base irregular verb. Example: contener, detener,
    // mantener, etc., all act like tener
    reverse(normalizedVerb);
    let prefix = "";
    let basePrefix = ""; // The prefix of the base verb's stem (for pattern-matched verbs)
    let isPatternMatch = false; // True if this is a pattern-match (e.g., producir→conducir) rather than true compound
    let base;
    if (typeof exceptions[verb] === "string") {
        original = verb;
        base = exceptions[verb];
        // Only calculate prefix if the base is a true suffix of the verb
        // (e.g., contener → tener, componer → poner)
        if (verb.endsWith(base)) {
            prefix = verb.substring(0, verb.length - base.length);
        }
        else {
            // For verbs that share a pattern but aren't true compounds
            // (e.g., producir → conducir), extract the differing stem prefix
            const baseEnding = base.substring(base.length - 2);
            const verbEnding = normalizedVerb.substring(normalizedVerb.length - 2);
            if (baseEnding === verbEnding) {
                // Find common suffix in stems (e.g., "duc" in "conduc" and "produc")
                const baseStem = base.substring(0, base.length - 2);
                const verbStem = stem;
                // Find how much of the base stem matches the end of the verb stem
                for (let i = baseStem.length; i >= 1; i--) {
                    const baseSuffix = baseStem.substring(baseStem.length - i);
                    if (verbStem.endsWith(baseSuffix)) {
                        prefix = verbStem.substring(0, verbStem.length - i);
                        basePrefix = baseStem.substring(0, baseStem.length - i);
                        isPatternMatch = true;
                        break;
                    }
                }
            }
        }
        verb = base;
        stem = base.substring(0, base.length - 2);
    }
    else if (typeof exceptions[normalizedVerb] === "string") {
        // Handle normalized verb lookups (for accented infinitives like oír)
        original = verb;
        base = exceptions[normalizedVerb];
        if (normalizedVerb.endsWith(base)) {
            prefix = normalizedVerb.substring(0, normalizedVerb.length - base.length);
        }
        verb = base;
        stem = base.substring(0, base.length - 2);
    }
    // Helper function to apply prefix to an exception value
    // For true compounds: just prepend prefix
    // For pattern matches: replace the base prefix with the verb prefix
    const applyPrefix = (exc) => {
        if (isPatternMatch && basePrefix) {
            // Replace the base prefix with the verb prefix
            // e.g., "conduje" with basePrefix="con", prefix="pro" → "produje"
            if (exc.startsWith(basePrefix)) {
                return prefix + exc.substring(basePrefix.length);
            }
        }
        return prefix + exc;
    };
    const person = (options && options.person) || "first";
    let personValue = person;
    const number = (options && options.number) || "singular";
    const mood = (options && options.mood) || "indicative";
    const tense = (options && options.tense) || "present";
    const positivity = (options && options.positivity) || "affirmative";
    let formality = (options && options.formality) || "formal";
    const hasFormality = options && (options.formality === "formal" || options.formality === "informal");
    const styling = (options && options.style && styles[options.style]) || styles["castillano"];
    if (styling.tuteo && person === "second" && number === "singular" && formality === "formal") {
        // in tuteo regions, you always use tu instead of usted
        formality = "informal";
    }
    if (styling.ustedes && person === "second" && number === "plural") {
        // in ustedes regions, the plural of tu is not vosotros, but ustedes instead,
        // which is the same as the third person plural
        personValue = "third";
    }
    if (hasFormality && person === "second" && formality === "formal") {
        // formal second person (usted/ustedes) uses third person verb endings
        personValue = "third";
    }
    // For exception lookups, try the original verb first, then normalized
    const lookupVerb = exceptions[verb] ? verb : (exceptions[normalizedVerb] ? normalizedVerb : verb);
    if (tense === "perfect" || tense === "pluperfect" || tense === "future perfect" || tense === "preterite perfect") {
        const personObj = endings.auxilliaries[personValue];
        if (personObj) {
            const pluralityObj = personObj[number];
            if (pluralityObj) {
                const moodObj = pluralityObj[mood];
                if (moodObj) {
                    const aux = moodObj[tense];
                    const endingObj = endings[ending];
                    const pastParticiple = endingObj["past participle"];
                    const suffix = pastParticiple.singular.masculine;
                    const verbExc = exceptions[lookupVerb];
                    let pastPart;
                    if (typeof verbExc === "object" && verbExc["past participle"]) {
                        pastPart = verbExc["past participle"];
                    }
                    else {
                        pastPart = stem + suffix;
                    }
                    ret = aux + " " + applyPrefix(pastPart);
                }
            }
        }
    }
    else {
        if (exceptions[original] && typeof exceptions[original] === "object") {
            // see if the requested options cause an exceptional inflection, else generate the regular inflection below
            const excOriginal = exceptions[original];
            if (excOriginal[mood]) {
                const moodObj = excOriginal[mood];
                const property = (mood === "imperative") ? positivity : tense;
                const tenseObj = moodObj[property];
                if (tenseObj && tenseObj[number] && tenseObj[number][personValue]) {
                    const exc = tenseObj[number][personValue];
                    if (typeof exc === "string") {
                        ret = exc;
                    }
                    else {
                        ret = exc[styling.voseo ? "vos" : "tu"];
                    }
                }
            }
        }
        if (!ret && exceptions[lookupVerb] && typeof exceptions[lookupVerb] === "object") {
            // see if the requested options cause an exceptional inflection, else generate the regular inflection below
            const excVerb = exceptions[lookupVerb];
            if (excVerb[mood]) {
                const moodObj = excVerb[mood];
                const property = (mood === "imperative") ? positivity : tense;
                const tenseObj = moodObj[property];
                if (tenseObj && tenseObj[number] && tenseObj[number][personValue]) {
                    const exc = tenseObj[number][personValue];
                    if (typeof exc === "string") {
                        ret = applyPrefix(exc);
                    }
                    else {
                        ret = applyPrefix(exc[styling.voseo ? "vos" : "tu"]);
                    }
                }
                if (ret && mood === "imperative" && ending === "er" && prefix &&
                    personValue === "second" && positivity === "affirmative" && number === "singular") {
                    ret = replaceLast(ret, "e", "é"); // only replace the last one
                }
            }
        }
        if (!ret) {
            // For regular conjugations:
            // - For pattern-matched verbs (like producir→conducir): use original stem, no prefix
            // - For true compound verbs (like contener→tener): use base stem + prefix
            const useOriginalStem = isPatternMatch;
            const conjugationStem = useOriginalStem ? originalStem : stem;
            const conjugationPrefix = useOriginalStem ? "" : prefix;
            const endingObj = endings[ending];
            const personObj = endingObj[personValue];
            if (personObj) {
                const pluralityObj = personObj[number];
                if (pluralityObj) {
                    const moodObj = pluralityObj[mood];
                    if (moodObj) {
                        if (typeof moodObj === "string") {
                            let finalStem = fixStem(conjugationStem, ending, moodObj, { ...options, person: personValue });
                            ret = conjugationPrefix + finalStem + moodObj;
                        }
                        else {
                            const property = (mood === "imperative") ? positivity : tense;
                            const tenseObj = moodObj[property];
                            if (tenseObj) {
                                if (typeof tenseObj === "string") {
                                    let finalStem = fixStem(conjugationStem, ending, tenseObj, { ...options, person: personValue });
                                    ret = conjugationPrefix + finalStem + tenseObj;
                                }
                                else {
                                    const suffix = tenseObj[styling.voseo ? "vos" : "tu"];
                                    let finalStem = fixStem(conjugationStem, ending, suffix, { ...options, person: personValue });
                                    ret = conjugationPrefix + finalStem + suffix;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    ret = ret || verb;
    return ret;
};
export default inflect;
//# sourceMappingURL=inflect.js.map