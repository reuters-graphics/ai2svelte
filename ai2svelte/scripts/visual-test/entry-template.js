import ComponentBody from "%%COMPONENT%%";
import { mount } from "svelte";

export default function factory(target, props) {
  return mount(ComponentBody, { target, props });
}
