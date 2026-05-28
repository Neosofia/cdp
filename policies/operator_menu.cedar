permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"operator"
) when {
    principal.roles.contains("operator")
};
