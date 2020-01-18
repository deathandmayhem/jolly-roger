import { EmojiConvertor } from 'emoji-js';
import twemoji from 'twemoji';

const emoji = new EmojiConvertor();
emoji.allow_native = true;
emoji.replace_mode = 'unified';

export default function emojify(text: string) {
  // Use emoji-js to replace colon-coded emoji with Unicode, and then use
  // twemoji to render the Unicode into twemoji images
  return twemoji.parse(emoji.replace_colons(text));
}
