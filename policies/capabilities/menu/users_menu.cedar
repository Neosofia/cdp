// Show the Users navigation menu to study-tier operators (CRO, sponsor, SMO).
permit (
    principal is ui::User,
    action == Action::"View",
    resource == ui::Menu::"users"
) when {
    principal.actors.contains("study")
};
