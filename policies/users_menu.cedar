// Top-level Users nav for study Tier-1 (CRO / sponsor / SMO operators).
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"users"
) when {
    principal.actors.contains("study")
};
