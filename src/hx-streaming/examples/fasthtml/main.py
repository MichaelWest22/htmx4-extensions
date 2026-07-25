import asyncio
from fasthtml.common import *

CSS = Style('''
    body { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
    .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; min-height: 120px; cursor: pointer; }
    .card:hover { border-color: #999; }
    .card h2 { margin: 0 0 0.5rem; font-size: 1rem; color: #666; }
    .card .value { font-size: 2rem; font-weight: bold; color: #111; }
    .loading { color: #aaa; font-style: italic; }
    .back { display: inline-block; margin-bottom: 1rem; color: #666; text-decoration: none; }
    .back:hover { color: #111; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem; }
    .stat { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
    .stat h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #666; }
    .stat .value { font-size: 1.5rem; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    th { color: #666; font-weight: normal; font-size: 0.9rem; }
''')

app, rt = fast_app(
    static_path='../../../..',
    htmx=False,
    hdrs=[Script(src='/test/lib/htmx.js'), Script(src='/src/hx-streaming/hx-streaming.js'), CSS]
)

#=============================================================================
# Streaming helpers
#=============================================================================

def is_partial(req):
    return req.headers.get('hx-request-type') == 'partial'

def placeholder(id, title, tag=H2):
    return Div(tag(title), Div('Loading...', cls='loading', id=id), cls='stat')

def swap(target, *content, swap='innerHTML'):
    inner = ''.join(to_xml(c) for c in content)
    return f'<hx-partial hx-target="#{target}" hx-swap="{swap}">{inner}</hx-partial> '

async def resolve(coro, target, render, **swap_kwargs):
    return swap(target, render(await coro), **swap_kwargs)

def stream_page(req, skeleton, tasks, pre_body=None):
    """
    Streams a page response.

    For htmx partial requests: sends any pre_body partials first (applied to
    the current page before the swap), then <body><skeleton></body> for htmx
    to unwrap and swap, then post-body partials as they complete.

    For direct navigation: wraps in a full HTML document, emits <hx-ready> to
    init htmx early, then streams post-body partials as they complete.
    """
    body = '<body>' + to_xml(skeleton) + '</body>'
    hdrs = ''.join(to_xml(h) for h in app.hdrs)

    async def generate():
        if is_partial(req):
            if pre_body:
                yield ''.join(pre_body)
                await asyncio.sleep(0.5)
            yield body
        else:
            yield f'<!doctype html><html><head>{hdrs}</head>{body}'
            yield '<hx-ready></hx-ready> '

        for done in asyncio.as_completed(tasks):
            yield await done

    return StreamingResponse(generate(), media_type='text/html', headers={'HX-Stream-Partials': 'true'})

#=============================================================================
# Fake async data
#=============================================================================

async def get_revenue():        await asyncio.sleep(1.0); return '$48,200'
async def get_users():          await asyncio.sleep(2.5); return '1,342'
async def get_orders():         await asyncio.sleep(1.8); return '87'
async def get_revenue_chart():  await asyncio.sleep(1.2); return [('Jan','$38k'),('Feb','$41k'),('Mar','$48k')]
async def get_revenue_top():    await asyncio.sleep(2.0); return [('Acme Corp','$12,400'),('Globex','$9,800'),('Initech','$7,100')]
async def get_users_active():   await asyncio.sleep(1.0); return '1,342'
async def get_users_new():      await asyncio.sleep(1.5); return '284'
async def get_users_churn():    await asyncio.sleep(2.2); return '3.1%'
async def get_users_top():      await asyncio.sleep(1.8); return [('Alice','142 sessions'),('Bob','98 sessions'),('Carol','87 sessions')]
async def get_orders_open():    await asyncio.sleep(0.8); return '87'
async def get_orders_late():    await asyncio.sleep(1.6); return '12'
async def get_orders_avg():     await asyncio.sleep(2.0); return '$340'
async def get_orders_list():    await asyncio.sleep(1.3); return [('#1042','Acme','$420'),('#1041','Globex','$310'),('#1040','Initech','$280')]

#=============================================================================
# Render helpers
#=============================================================================

def value_span(v):      return Span(v, cls='value')
def two_col_table(h1, h2): return lambda rows: Table(Tr(Th(h1), Th(h2)),       *[Tr(Td(a), Td(b))       for a,b   in rows])
def three_col_table(h1, h2, h3): return lambda rows: Table(Tr(Th(h1), Th(h2), Th(h3)), *[Tr(Td(a), Td(b), Td(c)) for a,b,c in rows])

#=============================================================================
# Routes
#=============================================================================

@rt('/')
async def index(req):
    CARDS = [
        ('revenue', 'Total Revenue',  '/detail/revenue'),
        ('users',   'Active Users',   '/detail/users'),
        ('orders',  'Pending Orders', '/detail/orders'),
    ]
    DATA = [get_revenue(), get_users(), get_orders()]

    def card(id, title, href, body):
        return Div(H2(title), body, cls='card', id=id,
                   hx_get=href, hx_target='#main', hx_swap='outerHTML', hx_push_url='true')

    skeleton = Main(
        H1('Dashboard'),
        Div(*[card(id, title, href, Div('Loading...', cls='loading')) for id, title, href in CARDS], cls='dashboard'),
        id='main'
    )

    async def resolve_card(coro, id, title, href):
        value = await coro
        return swap(id, card(id, title, href, Span(value, cls='value')), swap='outerHTML')

    tasks = [asyncio.create_task(resolve_card(data, id, title, href))
             for data, (id, title, href) in zip(DATA, CARDS)]

    return stream_page(req, skeleton, tasks)

@rt('/detail/revenue')
async def detail_revenue(req):
    skeleton = Main(
        A('← Dashboard', href='/', cls='back'), H1('Revenue Detail'),
        Div(
            placeholder('rev-chart', 'Monthly Trend', H3),
            placeholder('rev-top',   'Top Customers', H3),
            cls='detail-grid'
        ),
        id='main'
    )

    tasks = [
        asyncio.create_task(resolve(get_revenue_chart(), 'rev-chart', two_col_table('Month',    'Revenue'))),
        asyncio.create_task(resolve(get_revenue_top(),   'rev-top',   two_col_table('Customer', 'Revenue'))),
    ]

    pre_body = [swap('revenue', H2('Total Revenue'), Div('Loading...', cls='loading'))]
    return stream_page(req, skeleton, tasks, pre_body)

@rt('/detail/users')
async def detail_users(req):
    skeleton = Main(
        A('← Dashboard', href='/', cls='back'), H1('Users Detail'),
        Div(
            placeholder('u-active', 'Active Users',    H3),
            placeholder('u-new',    'New This Month',  H3),
            placeholder('u-churn',  'Churn Rate',      H3),
            placeholder('u-top',    'Top Users',       H3),
            cls='detail-grid'
        ),
        id='main'
    )

    tasks = [
        asyncio.create_task(resolve(get_users_active(), 'u-active', value_span)),
        asyncio.create_task(resolve(get_users_new(),    'u-new',    value_span)),
        asyncio.create_task(resolve(get_users_churn(),  'u-churn',  value_span)),
        asyncio.create_task(resolve(get_users_top(),    'u-top',    two_col_table('User', 'Activity'))),
    ]

    pre_body = [swap('users', H2('Active Users'), Div('Loading...', cls='loading'))]
    return stream_page(req, skeleton, tasks, pre_body)

@rt('/detail/orders')
async def detail_orders(req):
    skeleton = Main(
        A('← Dashboard', href='/', cls='back'), H1('Orders Detail'),
        Div(
            placeholder('o-open', 'Open Orders',   H3),
            placeholder('o-late', 'Late Orders',   H3),
            placeholder('o-avg',  'Average Value', H3),
            placeholder('o-list', 'Recent Orders', H3),
            cls='detail-grid'
        ),
        id='main'
    )

    tasks = [
        asyncio.create_task(resolve(get_orders_open(), 'o-open', value_span)),
        asyncio.create_task(resolve(get_orders_late(), 'o-late', value_span)),
        asyncio.create_task(resolve(get_orders_avg(),  'o-avg',  value_span)),
        asyncio.create_task(resolve(get_orders_list(), 'o-list', three_col_table('Order', 'Customer', 'Value'))),
    ]

    pre_body = [swap('orders', H2('Pending Orders'), Div('Loading...', cls='loading'))]
    return stream_page(req, skeleton, tasks, pre_body)

serve()
