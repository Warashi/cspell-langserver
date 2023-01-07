'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const cspell = __importStar(require("cspell-lib"));
// サーバー接続オブジェクトを作成する。この接続にはNodeのIPC(プロセス間通信)を利用する
// LSPの全機能を提供する
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
connection.console.info(`Sample server running in node ${process.version}`);
// 初期化ハンドルでインスタンス化する
let documents;
// 接続の初期化
connection.onInitialize((_params, _cancel, progress) => {
    // サーバーの起動を進捗表示する
    progress.begin('Initializing Sample Server');
    // テキストドキュメントを監視する
    documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
    setupDocumentsListeners();
    // 起動進捗表示の終了
    progress.done();
    return {
        // サーバー仕様
        capabilities: {
            // ドキュメントの同期
            textDocumentSync: {
                openClose: true,
                change: node_1.TextDocumentSyncKind.Incremental,
                willSaveWaitUntil: false,
                save: {
                    includeText: false,
                }
            }
        },
    };
});
/**
 * テキストドキュメントを検証する
 * @param doc 検証対象ドキュメント
 */
function validate(doc) {
    // 警告などの状態を管理するリスト
    const diagnostics = [];
    cspell.spellCheckDocument({ uri: doc.uri, text: doc.getText(), }, {}, {})
        .then((result) => {
        result.issues.forEach((issue) => {
            var _a, _b;
            const start = doc.positionAt(issue.offset);
            const end = doc.positionAt(issue.offset + ((_a = issue.length) !== null && _a !== void 0 ? _a : 0));
            const range = { start, end };
            const diagnostic = {
                range,
                message: (_b = issue.message) !== null && _b !== void 0 ? _b : "wrong spell",
                severity: node_1.DiagnosticSeverity.Warning,
                source: "cspell",
            };
            diagnostics.push(diagnostic);
        });
    });
    //接続に警告を通知する
    void connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}
/**
 * ドキュメントの動作を監視する
 */
function setupDocumentsListeners() {
    // ドキュメントを作成、変更、閉じる作業を監視するマネージャー
    documents.listen(connection);
    // 開いた時
    documents.onDidOpen((event) => {
        validate(event.document);
    });
    // 変更した時
    documents.onDidChangeContent((change) => {
        validate(change.document);
    });
    // 保存した時
    documents.onDidSave((change) => {
        validate(change.document);
    });
    // 閉じた時
    documents.onDidClose((close) => {
        // ドキュメントのURI(ファイルパス)を取得する
        const uri = close.document.uri;
        // 警告を削除する
        void connection.sendDiagnostics({ uri: uri, diagnostics: [] });
    });
}
// Listen on the connection
connection.listen();
