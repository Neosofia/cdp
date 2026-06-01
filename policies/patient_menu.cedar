permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"patient"
) when {
    principal.actors.contains("patient")
};
