<script lang="ts">
    import { company, displayName, version } from "../../../shared/shared";
</script>

<div class="tab-content">
    <p>{displayName} v{version} by {company}</p>
</div>

<style lang="scss">
    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
</style>
