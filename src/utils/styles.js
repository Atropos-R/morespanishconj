/*
 * styles.ts - return information about a style of Spanish
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
import { styljson as styles_es_json } from "./conjugatorData.js";
const styles = JSON.parse(styles_es_json);
const getStyle = function (styleName) {
    const style = styleName || "castillano";
    return styles[style];
};
export default getStyle;
//# sourceMappingURL=styles.js.map