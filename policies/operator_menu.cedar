permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"operator"
) when {
    principal.actors.contains("operator")
};
