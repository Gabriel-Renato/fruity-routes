    -- Confirmar todos os usuários não confirmados
    UPDATE auth.users 
    SET email_confirmed_at = NOW() 
    WHERE email_confirmed_at IS NULL;

    -- Verificar usuários confirmados
    SELECT id, email, email_confirmed_at, created_at
    FROM auth.users
    ORDER BY created_at DESC;

