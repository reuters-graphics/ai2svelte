import ComponentBody from "./Preview.svelte";
import { hydrate, mount, unmount } from "svelte";

export default function factory(target, props) {
  const component = mount(ComponentBody, { target, props });

  return {
    component,
    name: "RuntimeComponent",
    props,
    destroy: () => unmount(component),
    setProps: (props) => {
      hydrate(ComponentBody, { target, props });
    },
  };
}
