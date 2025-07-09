<script lang="ts">
    let { theme = "dark" } = $props();

    $effect(() => {
        if (theme && document) {
            document.documentElement.setAttribute("data-theme", theme);
        }
    });
</script>

<button
    class="theme-switcher"
    aria-label="Toggle theme"
    data-value={theme}
    onclick={(e) => (theme = theme == "dark" ? "light" : "dark")}
>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <g class="icon">
            <circle class="thumb" cx="50%" cy="50%" r="256"></circle>
            {#if theme == "light"}
                <path
                    fill="white"
                    style="transform: scale(0.75); transform-origin: center;"
                    d="M361.5 1.2c5 2.1 8.6 6.6 9.6 11.9L391 121l107.9 19.8c5.3 1 9.8 4.6 11.9 9.6s1.5 10.7-1.6 15.2L446.9 256l62.3 90.3c3.1 4.5 3.7 10.2 1.6 15.2s-6.6 8.6-11.9 9.6L391 391 371.1 498.9c-1 5.3-4.6 9.8-9.6 11.9s-10.7 1.5-15.2-1.6L256 446.9l-90.3 62.3c-4.5 3.1-10.2 3.7-15.2 1.6s-8.6-6.6-9.6-11.9L121 391 13.1 371.1c-5.3-1-9.8-4.6-11.9-9.6s-1.5-10.7 1.6-15.2L65.1 256 2.8 165.7c-3.1-4.5-3.7-10.2-1.6-15.2s6.6-8.6 11.9-9.6L121 121 140.9 13.1c1-5.3 4.6-9.8 9.6-11.9s10.7-1.5 15.2 1.6L256 65.1 346.3 2.8c4.5-3.1 10.2-3.7 15.2-1.6zM160 256a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zm224 0a128 128 0 1 0 -256 0 128 128 0 1 0 256 0z"
                />
            {:else if theme == "dark"}
                <path
                    fill="white"
                    style="transform: scale(0.75); transform-origin: center;"
                    d="M287.5 32C164 32 64 132.3 64 256S164 480 287.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"
                />
            {/if}
        </g>
    </svg>
</button>

<style lang="scss">
    @use "../../variables.scss" as *;

    .theme-switcher {
        all: unset;
        position: relative;
        height: 24px;
        width: 48px;
        padding: 4px;
        background-color: var(--color-tertiary);
        border-radius: 24px;
    }

    button {
        svg {
            height: 80%;
            width: auto;
            aspect-ratio: 1;
            position: absolute;
            top: 50%;
            left: 4px;
            right: unset;
            transform: translate(0%, -50%);
            @include animation-default;

            .icon {
                transform-origin: center;
                @include animation-default;
            }

            .thumb {
                fill: var(--color-accent-primary);
            }
        }
    }

    button[data-value="light"] svg {
        left: 4px;

        .icon {
            transform: rotate(-90deg);
        }
    }

    button[data-value="dark"] svg {
        left: calc(100% - 4px);
        transform: translate(-100%, -50%);

        .icon {
            transform: rotate(0deg);
        }
    }
</style>
