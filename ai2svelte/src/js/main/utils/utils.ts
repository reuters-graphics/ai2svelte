import type { Options } from 'svooltip';
import type { Placement } from '@floating-ui/dom';

export const tooltipSettings: Options = {
            placement: "top-start" as Placement,
            delay: [300, 0],
            offset: 0,
            target: "#layers",
        };