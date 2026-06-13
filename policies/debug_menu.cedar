// Show the debug navigation menu to users with the operator actor.
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"debug"
) when {
    principal.actors.contains("operator")
};
