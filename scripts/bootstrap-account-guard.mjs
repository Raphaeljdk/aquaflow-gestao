// A senha inicial serve exclusivamente para a primeira criação.
// Publicações posteriores não devem exigir que o segredo inicial permaneça
// igual ao hash da conta (o proprietário pode alterar a própria senha).
// Todas as contas existentes devem permanecer ativas, vinculadas e com hash bcrypt.
export function validProvisionedUser(user, role, needsEmployee = false) {
  return Boolean(
    user &&
    user.ativo === true &&
    user.role === role &&
    typeof user.password === "string" &&
    /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.password) &&
    (!needsEmployee || (typeof user.funcionarioId === "string" && user.funcionarioId.length > 0))
  );
}
