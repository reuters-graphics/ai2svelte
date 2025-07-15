<script lang="ts">
    import { onMount, untrack } from "svelte";

    import { settingsObject } from "../stores";

    import PreviewFrame from "../Components/PreviewFrame.svelte";

    import BirdStats from "../example/ai2svelte/bird-stats.svelte";

    import { fs, path, os } from "../../lib/cep/node";

    import { compile, parse } from "svelte/compiler";

    import { csi } from "../../lib/utils/bolt";

    import { Spring } from "svelte/motion";
    import { evalTS } from "../../lib/utils/bolt";

    let PreviewComponent = $state();
    let PreviewAssetsPath = $state();

    let previewWidth = new Spring(800);
    let previewHeight = new Spring(400);

    onMount(async () => {
        console.log($settingsObject);

        if (window.cep) {
            await getSvelteFile();
        }
    });

    // Resolve the tilde path
    function resolveTildePath(filePath) {
        if (filePath.startsWith("~/")) {
            return path.join(os.homedir(), filePath.slice(2));
        }
        return path.resolve(filePath);
    }

    // Read file with proper path resolution
    function readTextFile(filePath) {
        try {
            const resolvedPath = resolveTildePath(filePath);
            const data = fs.readFileSync(resolvedPath, "utf8");

            console.log("reading source file");

            return data;
        } catch (error) {
            console.error("Error reading file:", error);
            console.error("Resolved path:", resolveTildePath(filePath));
            return null;
        }
    }

    async function createWritableFile(writablePath, fileName, fileContent) {
        // Ensure directory exists
        const folder = await evalTS("makeFolder", writablePath);

        const filePath = writablePath + fileName;

        try {
            const file = await evalTS("makeFile", filePath, fileContent);

            console.log("File created successfully:", filePath);

            return filePath;
        } catch (error) {
            console.error("Error creating file:", error);
            return null;
        }
    }

    // ~/Desktop/projects/playground/customScrollyVideo/project-files/test2.ai
    // ../src/lib/ai2svelte/
    // ~/Desktop/projects/playground/customScrollyVideo/ src/lib/ai2svelte/
    async function getSvelteFile() {
        const aiFilePath: string | undefined = await evalTS("getFilePath");
        const svelteFileRelativePath = $settingsObject.html_output_path;

        // let htmlFileDestinationFolder = docPath + svelteFileRelativePath;
        // let htmlFileDestination =
        //     htmlFileDestinationFolder +
        //     "pageName" +
        //     $settingsObject.html_output_extension;

        let path, fileName;
        if (aiFilePath && aiFilePath.match(new RegExp(/(.*)\/(.*).ai/))) {
            path = aiFilePath.match(new RegExp(/(.*)\/(.*).ai/))[1];
            fileName = aiFilePath.match(new RegExp(/(.*)\/(.*).ai/))[2];
        }

        const filePath =
            path +
            "/" +
            svelteFileRelativePath +
            fileName +
            $settingsObject.html_output_extension;

        PreviewAssetsPath =
            "file:///" + path + "/" + $settingsObject.image_output_path;

        console.log("assetsPath" + PreviewAssetsPath);
        const componentCode = readTextFile(filePath);
        console.log(filePath);
        // console.log(componentCode);

        // Option 1: Use extension's own directory
        const extensionPath = csi.getSystemPath("extension");
        const writablePath = extensionPath + "/writable/";

        // console.log(componentCode);

        const compiledComponentCode = compile(componentCode, {
            generate: "client", // or 'ssr' for server-side rendering
        });

        console.log(compiledComponentCode);

        const tFilePath = await createWritableFile(
            writablePath,
            "testComp.svelte",
            componentCode,
        );

        setTimeout(async () => {
            console.log(JSON.stringify(tFilePath));

            const resp = (await import(tFilePath)).default;

            // const resp = new Response(html + `<style></style>`);

            PreviewComponent = resp;

            console.log(resp);
        }, 1000);

        // const parsedCode = parse(compiledComponentCode);
        // console.log(parsedCode);

        // const file = await createWritableFile(
        //     writablePath,
        //     fileName,
        //     parsedCode,
        // );

        // let component = await import(file);
        // console.log(component);
    }
</script>

<div class="tab-content">
    <PreviewFrame {previewWidth} {previewHeight}>
        {#if PreviewComponent}
            <PreviewComponent assetsPath={PreviewAssetsPath} />
        {:else}
            <BirdStats assetsPath={"../../../assets"} />
        {/if}
    </PreviewFrame>
</div>

<style lang="scss">
    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
</style>
