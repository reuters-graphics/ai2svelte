import type { Options } from 'svooltip';
import type { Placement } from '@floating-ui/dom';

export const tooltipSettings: Options = {
            placement: "top-start" as Placement,
            delay: [300, 0],
            offset: 0,
            target: "#layers",
        };

/**
 * Fetches a new random image URL from the Picsum Photos service.
 *
 * Makes a network request to "https://picsum.photos/300/200" and returns the final image URL.
 * If the request fails, logs the error and returns `undefined`.
 *
 * @returns {Promise<string | undefined>} A promise that resolves to the image URL, or `undefined` if an error occurs.
 */
export async function fetchNewImageURL() {
    try {
        const imgURL = await fetch("https://picsum.photos/300/200").then(
            (res) => res.url,
        );
        return imgURL;
    } catch (error) {
        console.log(error);
        return undefined;
    }
}