/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import {setupWechatPlatform} from 'wechat_platform.js';

/**
 * @param config SystemConfig object that contains the Tensorflow.js runtime,
 *     fetch polyfill and WeChat offline canvas.
 * @param debug enable debug logging for the plugin.
 */
export function configPlugin(config, debug) {
  setupWechatPlatform(config, debug);
}
