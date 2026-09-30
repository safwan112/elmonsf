<?php

// Vercel serverless entry point (vercel-php runtime): vercel.json rewrites API
// requests here. Present the request as if it hit public/index.php at the web
// root; otherwise Laravel would treat "/api" (this file's folder) as the base
// path and strip it from every route.
$_SERVER['SCRIPT_FILENAME'] = __DIR__.'/../public/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require __DIR__.'/../public/index.php';
