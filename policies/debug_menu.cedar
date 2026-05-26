permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"debug"
) when {
    principal.roles.contains("admin")
};
